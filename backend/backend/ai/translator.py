"""
AI Translation Service - Chinese to Korean
Uses Google Gemini for natural, context-aware translation
"""
import os
import logging
from typing import Optional, Dict
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
            self.client = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("✅ AI Translator initialized (Gemini 2.5 Flash)")

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
            korean_title = response.text.strip()
            logger.info(f"✅ Translated title: {korean_title[:50]}...")
            return korean_title

        except Exception as e:
            logger.error(f"❌ Translation failed: {str(e)}")
            return None

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
            korean_desc = response.text.strip()
            logger.info(f"✅ Translated description ({len(korean_desc)} chars)")
            return korean_desc

        except Exception as e:
            logger.error(f"❌ Description translation failed: {str(e)}")
            return None

    def translate_product(self, product_data: Dict) -> Dict:
        """
        Translate all text fields in product data

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

            # Translate title
            if 'title' in translated and translated['title']:
                korean_title = self.translate_product_title(translated['title'])
                if korean_title:
                    # Save original and translated versions
                    translated['title_cn'] = translated['title']
                    translated['title'] = korean_title
                    translated['title_kr'] = korean_title

            # Translate description
            if 'desc' in translated and translated['desc']:
                korean_desc = self.translate_product_description(translated['desc'])
                if korean_desc:
                    translated['desc_cn'] = translated['desc']
                    translated['desc'] = korean_desc
                    translated['desc_kr'] = korean_desc

            # Translate product options (SKU variants)
            if 'options' in translated and translated['options']:
                logger.info(f"🔄 Translating {len(translated['options'])} option groups...")
                for option in translated['options']:
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

            # Mark as translated
            translated['translated'] = True
            translated['translation_provider'] = 'gemini'

            logger.info("✅ Product translation completed")
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
