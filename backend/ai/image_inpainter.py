"""
AI Image Inpainting Service
IOPaint (LaMa) 기반 이미지 인페인팅
"""
import logging
import os
import base64
import io
import requests
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)


class ImageInpainter:
    """AI 이미지 인페인팅 서비스"""

    def __init__(self, iopaint_url: Optional[str] = None):
        """
        Initialize inpainter

        Args:
            iopaint_url: IOPaint 서비스 URL (default: http://localhost:8090)
        """
        self.iopaint_url = iopaint_url or os.getenv('IOPAINT_URL', 'http://localhost:8090')
        logger.info(f"✅ ImageInpainter initialized with URL: {self.iopaint_url}")

    def inpaint(
        self,
        image_base64: str,
        mask_base64: str,
        model: str = 'lama'
    ) -> Optional[str]:
        """
        이미지 인페인팅 수행

        Args:
            image_base64: 원본 이미지 (base64 인코딩)
            mask_base64: 마스크 이미지 (base64 인코딩, 흰색=제거 영역)
            model: 인페인팅 모델 ('lama', 'ldm', 'mat')

        Returns:
            편집된 이미지 (base64 인코딩) 또는 None
        """
        try:
            # Base64 디코딩
            image_data = base64.b64decode(image_base64.split(',')[1] if ',' in image_base64 else image_base64)
            mask_data = base64.b64decode(mask_base64.split(',')[1] if ',' in mask_base64 else mask_base64)

            # PIL 이미지로 변환
            image = Image.open(io.BytesIO(image_data))
            mask = Image.open(io.BytesIO(mask_data))

            logger.info(f"🖼️ Image size: {image.size}, Mask size: {mask.size}")

            # 마스크를 이미지와 같은 크기로 조정
            if image.size != mask.size:
                mask = mask.resize(image.size, Image.LANCZOS)
                logger.info(f"✅ Mask resized to {mask.size}")

            # IOPaint API 호출
            image_bytes = io.BytesIO()
            mask_bytes = io.BytesIO()
            image.save(image_bytes, format='PNG')
            mask.save(mask_bytes, format='PNG')
            image_bytes.seek(0)
            mask_bytes.seek(0)

            # IOPaint /api/v1/run 엔드포인트 호출
            response = requests.post(
                f"{self.iopaint_url}/api/v1/run",
                files={
                    'image': ('image.png', image_bytes, 'image/png'),
                    'mask': ('mask.png', mask_bytes, 'image/png')
                },
                data={
                    'ldmSteps': 25,
                    'ldmSampler': 'plms',
                    'hdStrategy': 'Original',
                    'hdStrategyResizeLimit': 2048,
                }
            )

            if response.status_code != 200:
                logger.error(f"❌ IOPaint API error: {response.status_code} - {response.text}")
                return None

            # 결과 이미지를 base64로 인코딩
            result_image = Image.open(io.BytesIO(response.content))
            buffered = io.BytesIO()
            result_image.save(buffered, format='PNG')
            result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

            logger.info("✅ Inpainting successful")
            return f"data:image/png;base64,{result_base64}"

        except requests.exceptions.ConnectionError:
            logger.error("❌ Cannot connect to IOPaint service. Make sure it's running.")
            logger.error(f"   Start IOPaint: iopaint start --model=lama --device=cpu --port=8090 --host=0.0.0.0")
            return None
        except Exception as e:
            logger.error(f"❌ Inpainting failed: {str(e)}", exc_info=True)
            return None

    def check_service(self) -> bool:
        """
        IOPaint 서비스 상태 확인

        Returns:
            서비스 실행 중이면 True
        """
        try:
            response = requests.get(f"{self.iopaint_url}/api/v1/model", timeout=2)
            if response.status_code == 200:
                logger.info("✅ IOPaint service is running")
                return True
            return False
        except Exception:
            logger.warning("⚠️ IOPaint service is not running")
            return False


# Singleton instance
_inpainter_instance = None


def get_inpainter() -> ImageInpainter:
    """이미지 인페인터 싱글톤 인스턴스 반환"""
    global _inpainter_instance
    if _inpainter_instance is None:
        _inpainter_instance = ImageInpainter()
    return _inpainter_instance
