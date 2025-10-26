"""
AI Image Inpainting Service
Google Gemini를 사용한 이미지 인페인팅
"""
import logging
import os
import base64
import io
from typing import Optional
from PIL import Image
import google.generativeai as genai

logger = logging.getLogger(__name__)


class ImageInpainter:
    """AI 이미지 인페인팅 서비스 (Gemini 기반)"""

    def __init__(self):
        """
        Initialize inpainter with Gemini API
        """
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("⚠️ GEMINI_API_KEY not set. Image inpainting will not work.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            # Gemini 2.0 Flash Experimental 모델 사용
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info(f"✅ ImageInpainter initialized with Gemini API")

    def inpaint(
        self,
        image_base64: str,
        mask_base64: str,
        model: str = 'lama'
    ) -> Optional[str]:
        """
        이미지 인페인팅 수행 (Gemini API 사용)

        Args:
            image_base64: 원본 이미지 (base64 인코딩)
            mask_base64: 마스크 이미지 (base64 인코딩, 빨간색=제거 영역)
            model: 모델 파라미터 (호환성 유지용, 실제로는 Gemini 사용)

        Returns:
            편집된 이미지 (base64 인코딩) 또는 None
        """
        try:
            if not self.model:
                logger.error("❌ Gemini API not configured")
                return None

            # Base64 디코딩
            image_data = base64.b64decode(image_base64.split(',')[1] if ',' in image_base64 else image_base64)
            mask_data = base64.b64decode(mask_base64.split(',')[1] if ',' in mask_base64 else mask_base64)

            # PIL로 이미지 로드
            image = Image.open(io.BytesIO(image_data))
            mask = Image.open(io.BytesIO(mask_data))

            # 마스크 크기 조정
            if mask.size != image.size:
                logger.info(f"Resizing mask from {mask.size} to {image.size}")
                mask = mask.resize(image.size, Image.Resampling.LANCZOS)

            # 마스크에서 빨간색 영역 감지하여 흰색 마스크로 변환
            mask_rgb = mask.convert('RGB')
            mask_pixels = mask_rgb.load()
            width, height = mask.size

            # 새로운 흑백 마스크 생성
            binary_mask = Image.new('L', (width, height), 0)
            binary_pixels = binary_mask.load()

            # 빨간색 영역을 흰색으로 변환
            for y in range(height):
                for x in range(width):
                    r, g, b = mask_pixels[x, y]
                    # 빨간색 영역 감지 (r > 100 and g < 100 and b < 100)
                    if r > 100 and g < 100 and b < 100:
                        binary_pixels[x, y] = 255  # 흰색 (제거 영역)

            logger.info(f"🖼️ Starting inpainting with Gemini API")
            logger.info(f"Image size: {image.size}")

            # Gemini API를 사용한 이미지 편집
            # 마스크 영역의 내용을 자연스럽게 채우도록 요청
            prompt = """You are an expert at image inpainting.
Remove the objects in the white areas of the mask and fill them naturally with the surrounding background.
Keep the rest of the image exactly the same.
The result should look seamless and natural, as if the removed objects were never there.
Return only the edited image without any text or explanations."""

            # 이미지를 bytes로 변환
            image_bytes = io.BytesIO()
            image.save(image_bytes, format='PNG')
            image_bytes = image_bytes.getvalue()

            mask_bytes = io.BytesIO()
            binary_mask.save(mask_bytes, format='PNG')
            mask_bytes = mask_bytes.getvalue()

            # Gemini API 호출 (이미지 + 마스크)
            response = self.model.generate_content([
                {
                    'mime_type': 'image/png',
                    'data': image_bytes
                },
                {
                    'mime_type': 'image/png',
                    'data': mask_bytes
                },
                prompt
            ])

            # 응답에서 이미지 추출
            if hasattr(response, 'parts') and len(response.parts) > 0:
                for part in response.parts:
                    if hasattr(part, 'inline_data'):
                        result_data = part.inline_data.data
                        result_base64 = base64.b64encode(result_data).decode('utf-8')
                        logger.info("✅ Inpainting successful with Gemini API")
                        return f"data:image/png;base64,{result_base64}"

            # 이미지가 응답에 없으면 원본 반환
            logger.warning("⚠️ Gemini did not return an edited image, returning original")
            return image_base64 if image_base64.startswith('data:') else f"data:image/png;base64,{image_base64}"

        except Exception as e:
            logger.error(f"❌ Gemini inpainting failed: {str(e)}", exc_info=True)
            # 에러 발생시 원본 이미지 반환
            return image_base64 if image_base64.startswith('data:') else f"data:image/png;base64,{image_base64}"

    def check_service(self) -> bool:
        """
        Gemini API 상태 확인

        Returns:
            API가 설정되어 있으면 True
        """
        return self.model is not None


# Singleton instance
_inpainter_instance = None


def get_inpainter() -> ImageInpainter:
    """이미지 인페인터 싱글톤 인스턴스 반환"""
    global _inpainter_instance
    if _inpainter_instance is None:
        _inpainter_instance = ImageInpainter()
    return _inpainter_instance
