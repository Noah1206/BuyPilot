"""
AI Translation Service - Chinese to Korean
Uses Google Gemini for natural, context-aware translation
"""
import os
import logging
from typing import Optional, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import google.generativeai as genai

logger = logging.getLogger(__name__)


class AITranslator:
    """AI-powered translator for product information"""

    def __init__(self):
        """Initialize Gemini client"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("⚠️ GEMINI_API_KEY not configured. Translation will be disabled.")
            self.client = None
        else:
            genai.configure(api_key=api_key)

            # Configure safety settings to allow translation of all content
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                }
            ]

            self.client = genai.GenerativeModel(
                'gemini-2.5-flash',
                safety_settings=safety_settings
            )
            logger.info("✅ AI Translator initialized (Gemini 2.5 Flash with relaxed safety)")

    def translate_korean_to_chinese(self, korean_text: str) -> Optional[str]:
        """
        Translate Korean text to Chinese (for Taobao search)

        Args:
            korean_text: Korean product title or keyword

        Returns:
            Chinese translation optimized for Taobao search
        """
        if not self.client or not korean_text:
            return None

        try:
            logger.info(f"🔄 Translating Korean to Chinese: {korean_text[:50]}...")

            prompt = f"""You are a professional translator specializing in e-commerce product search.
Translate the following Korean product title/keyword to Chinese (Simplified Chinese).

Requirements:
- Focus on common Taobao search terms
- Keep it concise and searchable
- Use popular product terminology
- Return ONLY the Chinese translation, no explanations

Korean text: {korean_text}

Chinese translation:"""

            response = self.client.generate_content(prompt)

            # Safely access response text
            if not response or not response.parts:
                logger.warning(f"⚠️ Empty response from Gemini (finish_reason: {response.candidates[0].finish_reason if response.candidates else 'unknown'})")
                return korean_text

            chinese_text = response.text.strip()
            logger.info(f"✅ Korean→Chinese: {chinese_text[:50]}...")
            return chinese_text

        except Exception as e:
            logger.error(f"❌ Korean to Chinese translation failed: {str(e)}")
            # Fallback: return original text
            return korean_text

    def translate_product_title(self, chinese_title: str) -> Optional[str]:
        """
        Translate product title from Chinese to Korean

        Args:
            chinese_title: Original Chinese product title

        Returns:
            Korean translation or None if failed
        """
        if not self.client or not chinese_title:
            return None

        try:
            logger.info(f"🔄 Translating title: {chinese_title[:50]}...")

            prompt = f"""You are a professional translator specializing in e-commerce product titles.
Translate the following Chinese product title to Korean.

Requirements:
- Natural, marketing-friendly Korean
- Keep product specifications (numbers, model names) as-is
- Make it appealing to Korean consumers
- Keep it concise (under 100 characters if possible)
- Return ONLY the Korean translation, no explanations

Chinese title: {chinese_title}

Korean translation:"""

            response = self.client.generate_content(prompt)

            # Safely access response text
            if not response or not response.parts:
                logger.warning(f"⚠️ Empty response from Gemini (finish_reason: {response.candidates[0].finish_reason if response.candidates else 'unknown'})")
                return chinese_title  # Return original if translation blocked

            korean_title = response.text.strip()
            logger.info(f"✅ Translated title: {korean_title[:50]}...")
            return korean_title

        except Exception as e:
            logger.error(f"❌ Translation failed: {str(e)}")
            return chinese_title  # Return original text instead of None

    def translate_product_description(self, chinese_desc: str) -> Optional[str]:
        """
        Translate product description from Chinese to Korean

        Args:
            chinese_desc: Original Chinese description

        Returns:
            Korean translation or None if failed
        """
        if not self.client or not chinese_desc:
            return None

        try:
            logger.info(f"🔄 Translating description ({len(chinese_desc)} chars)...")

            # Truncate if too long
            if len(chinese_desc) > 2000:
                chinese_desc = chinese_desc[:2000] + "..."
                logger.warning("⚠️ Description truncated to 2000 characters")

            prompt = f"""You are a professional translator specializing in e-commerce product descriptions.
Translate the following Chinese product description to Korean.

Requirements:
- Natural, persuasive Korean that appeals to consumers
- Maintain product specifications and technical details
- Keep formatting and structure
- Professional tone
- Return ONLY the Korean translation, no explanations

Chinese description:
{chinese_desc}

Korean translation:"""

            response = self.client.generate_content(prompt)

            # Safely access response text
            if not response or not response.parts:
                logger.warning(f"⚠️ Empty response from Gemini (finish_reason: {response.candidates[0].finish_reason if response.candidates else 'unknown'})")
                return chinese_desc  # Return original if translation blocked

            korean_desc = response.text.strip()
            logger.info(f"✅ Translated description ({len(korean_desc)} chars)")
            return korean_desc

        except Exception as e:
            logger.error(f"❌ Description translation failed: {str(e)}")
            return chinese_desc  # Return original text instead of None

    def _translate_options_parallel(self, options):
        """Helper function to translate options in parallel"""
        if not options:
            return options

        logger.info(f"🔄 Translating {len(options)} option groups in parallel...")

        try:
            for option in options:
                # Translate option name (e.g., "颜色" → "색상")
                if option.get('name'):
                    try:
                        korean_option_name = self.translate_product_title(option['name'])
                        if korean_option_name:
                            option['name_cn'] = option['name']
                            option['name'] = korean_option_name
                    except Exception as e:
                        logger.warning(f"⚠️ Option name translation failed: {str(e)}")

                # Translate option values (e.g., "黑色" → "블랙")
                if option.get('values'):
                    for value in option['values']:
                        if value.get('name'):
                            try:
                                korean_value_name = self.translate_product_title(value['name'])
                                if korean_value_name:
                                    value['name_cn'] = value['name']
                                    value['name'] = korean_value_name
                            except Exception as e:
                                logger.warning(f"⚠️ Option value translation failed: {str(e)}")

            logger.info("✅ Options translation completed")
            return options

        except Exception as e:
            logger.error(f"❌ Options translation failed: {str(e)}")
            return options

    def translate_product(self, product_data: Dict) -> Dict:
        """
        Translate all text fields in product data (parallel version - 2-3x faster)

        Args:
            product_data: Product dictionary with Chinese text

        Returns:
            Product dictionary with Korean translations added
        """
        if not self.client:
            logger.warning("⚠️ Translation skipped - Gemini not configured")
            return product_data

        try:
            # Create copy to avoid modifying original
            translated = product_data.copy()

            logger.info("🚀 Starting parallel translation (title + description + options)...")

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
            translated['translation_provider'] = 'gemini'

            logger.info("🎉 Product translation completed (parallel mode)")
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
