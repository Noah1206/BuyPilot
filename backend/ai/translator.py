"""
AI Translation Service - Chinese to Korean
Uses Google Translate for fast, reliable translation
"""
import os
import logging
from typing import Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse
import urllib.request
import json
import ssl

logger = logging.getLogger(__name__)


class AITranslator:
    """Google Translate-based translator for product information"""

    def __init__(self):
        """Initialize Google Translate client"""
        self.client = True  # Google Translate doesn't need API key
        logger.info("✅ AI Translator initialized (Google Translate)")

    def _google_translate(self, text: str, from_lang: str, to_lang: str) -> Optional[str]:
        """
        Translate text using Google Translate API

        Args:
            text: Text to translate
            from_lang: Source language code (e.g., 'ko', 'zh-CN')
            to_lang: Target language code (e.g., 'ko', 'zh-CN')

        Returns:
            Translated text or None if failed
        """
        if not text:
            return None

        try:
            url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={from_lang}&tl={to_lang}&dt=t&q={urllib.parse.quote(text)}'

            # Create SSL context that doesn't verify certificates (for development)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            with urllib.request.urlopen(url, timeout=10, context=ssl_context) as response:
                result = json.loads(response.read().decode('utf-8'))

                # Extract translated text
                if result and len(result) > 0 and len(result[0]) > 0:
                    translated = ''.join([part[0] for part in result[0] if part[0]])
                    return translated

                return None

        except Exception as e:
            logger.error(f"❌ Google Translate error: {str(e)}")
            return None

    def translate_korean_to_chinese(self, korean_text: str) -> Optional[str]:
        """
        Translate Korean text to Chinese (for Taobao search)

        Args:
            korean_text: Korean product title or keyword

        Returns:
            Chinese translation optimized for Taobao search
        """
        if not korean_text:
            return None

        try:
            logger.info(f"🔄 Translating Korean to Chinese: {korean_text[:50]}...")

            chinese_text = self._google_translate(korean_text, 'ko', 'zh-CN')

            if chinese_text:
                logger.info(f"✅ Korean→Chinese: {chinese_text[:50]}...")
                return chinese_text
            else:
                logger.warning("⚠️ Translation returned empty, using original text")
                return korean_text

        except Exception as e:
            logger.error(f"❌ Korean to Chinese translation failed: {str(e)}")
            return korean_text

    def translate_product_title(self, chinese_title: str) -> Optional[str]:
        """
        Translate product title from Chinese to Korean

        Args:
            chinese_title: Original Chinese product title

        Returns:
            Korean translation or None if failed
        """
        if not chinese_title:
            return None

        try:
            logger.info(f"🔄 Translating title: {chinese_title[:50]}...")

            korean_title = self._google_translate(chinese_title, 'zh-CN', 'ko')

            if korean_title:
                logger.info(f"✅ Translated title: {korean_title[:50]}...")
                return korean_title
            else:
                logger.warning("⚠️ Translation returned empty, using original text")
                return chinese_title

        except Exception as e:
            logger.error(f"❌ Translation failed: {str(e)}")
            return chinese_title

    def translate_product_description(self, chinese_desc: str) -> Optional[str]:
        """
        Translate product description from Chinese to Korean

        Args:
            chinese_desc: Original Chinese description

        Returns:
            Korean translation or None if failed
        """
        if not chinese_desc:
            return None

        try:
            logger.info(f"🔄 Translating description ({len(chinese_desc)} chars)...")

            # Truncate if too long (Google Translate URL limit)
            if len(chinese_desc) > 2000:
                chinese_desc = chinese_desc[:2000] + "..."
                logger.warning("⚠️ Description truncated to 2000 characters")

            korean_desc = self._google_translate(chinese_desc, 'zh-CN', 'ko')

            if korean_desc:
                logger.info(f"✅ Translated description ({len(korean_desc)} chars)")
                return korean_desc
            else:
                logger.warning("⚠️ Translation returned empty, using original text")
                return chinese_desc

        except Exception as e:
            logger.error(f"❌ Description translation failed: {str(e)}")
            return chinese_desc

    def _translate_options_parallel(self, options):
        """Helper function to translate options in batch (memory-optimized)"""
        if not options:
            return options

        logger.info(f"🔄 Translating {len(options)} option groups...")

        try:
            # Translate each option name and value individually
            for opt_idx, option in enumerate(options):
                # Translate option name
                if option.get('name'):
                    korean_name = self._google_translate(option['name'], 'zh-CN', 'ko')
                    if korean_name:
                        option['name_cn'] = option['name']
                        option['name'] = korean_name

                # Translate option values
                if option.get('values'):
                    for val_idx, value in enumerate(option['values']):
                        if value.get('name'):
                            korean_value = self._google_translate(value['name'], 'zh-CN', 'ko')
                            if korean_value:
                                value['name_cn'] = value['name']
                                value['name'] = korean_value

            logger.info(f"✅ Options translation completed")
            return options

        except Exception as e:
            logger.error(f"❌ Options translation failed: {str(e)}")
            return options

    def translate_product(self, product_data: Dict) -> Dict:
        """
        Translate all text fields in product data

        Args:
            product_data: Product dictionary with Chinese text

        Returns:
            Product dictionary with Korean translations added
        """
        try:
            # Create copy to avoid modifying original
            translated = product_data.copy()

            logger.info("🚀 Starting translation (title + description + options)...")

            # Parallel translation with ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=3) as executor:
                # Submit all translation tasks
                title_future = None
                desc_future = None
                options_future = None

                if 'title' in translated and translated['title']:
                    title_future = executor.submit(self.translate_product_title, translated['title'])

                if 'desc' in translated and translated['desc']:
                    desc_future = executor.submit(self.translate_product_description, translated['desc'])

                if 'options' in translated and translated['options']:
                    options_future = executor.submit(self._translate_options_parallel, translated['options'])

                # Collect results
                if title_future:
                    korean_title = title_future.result()
                    if korean_title:
                        translated['title_cn'] = translated['title']
                        translated['title'] = korean_title
                        translated['title_kr'] = korean_title
                        logger.info("✅ Title translated")

                if desc_future:
                    korean_desc = desc_future.result()
                    if korean_desc:
                        translated['desc_cn'] = translated['desc']
                        translated['desc'] = korean_desc
                        translated['desc_kr'] = korean_desc
                        logger.info("✅ Description translated")

                if options_future:
                    translated['options'] = options_future.result()

            # Mark as translated
            translated['translated'] = True
            translated['translation_provider'] = 'google_translate'

            logger.info("🎉 Product translation completed")
            return translated

        except Exception as e:
            logger.error(f"❌ Product translation failed: {str(e)}")
            return product_data


# Singleton instance
_translator = None

def get_translator() -> AITranslator:
    """Get or create AI translator singleton"""
    global _translator
    if _translator is None:
        _translator = AITranslator()
    return _translator
