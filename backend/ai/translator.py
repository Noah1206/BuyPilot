"""
AI Translation Service - Chinese to Korean
Uses OpenAI GPT for natural, context-aware translation
"""
import os
import logging
from typing import Optional, Dict
import openai

logger = logging.getLogger(__name__)


class AITranslator:
    """AI-powered translator for product information"""

    def __init__(self):
        """Initialize OpenAI client"""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            logger.warning("⚠️ OPENAI_API_KEY not configured. Translation will be disabled.")
            self.client = None
        else:
            self.client = openai.OpenAI(api_key=api_key)
            logger.info("✅ AI Translator initialized")

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

Chinese title: {chinese_title}

Korean translation:"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional e-commerce translator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent translations
                max_tokens=200
            )

            korean_title = response.choices[0].message.content.strip()
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

Chinese description:
{chinese_desc}

Korean translation:"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional e-commerce translator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )

            korean_desc = response.choices[0].message.content.strip()
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
            logger.warning("⚠️ Translation skipped - OpenAI not configured")
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

            # Mark as translated
            translated['translated'] = True
            translated['translation_provider'] = 'openai'

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
