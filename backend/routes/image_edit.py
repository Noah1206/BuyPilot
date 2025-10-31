"""
Image Editing API Routes
AI 이미지 인페인팅 (배경 제거, 객체 제거)
이미지 텍스트 OCR 및 번역
"""
from flask import Blueprint, request, jsonify
import logging
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import requests

bp = Blueprint('image_edit', __name__)
logger = logging.getLogger(__name__)


@bp.route('/api/image/inpaint', methods=['POST'])
def inpaint_image():
    """
    AI 이미지 인페인팅

    Body: {
        image: string (base64),  // 원본 이미지
        mask: string (base64),   // 마스크 (흰색=제거 영역)
        model: string (optional) // 'lama', 'ldm', 'mat' (default: lama)
    }

    Returns: {
        ok: boolean,
        data: {
            result: string (base64)  // 편집된 이미지
        }
    }
    """
    try:
        data = request.get_json()

        image_base64 = data.get('image')
        mask_base64 = data.get('mask')
        model = data.get('model', 'lama')

        if not image_base64 or not mask_base64:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_DATA',
                    'message': 'Image and mask are required'
                }
            }), 400

        logger.info(f"🎨 Inpainting request - model: {model}")

        # Get inpainter instance
        from ai.image_inpainter import get_inpainter
        inpainter = get_inpainter()

        # Perform inpainting
        result_base64 = inpainter.inpaint(image_base64, mask_base64, model)

        if not result_base64:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'INPAINT_FAILED',
                    'message': 'Failed to inpaint image. Make sure IOPaint service is running.'
                }
            }), 500

        logger.info("✅ Inpainting completed successfully")

        return jsonify({
            'ok': True,
            'data': {
                'result': result_base64
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Inpainting error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': 'Internal server error',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/api/image/inpaint/status', methods=['GET'])
def inpaint_status():
    """
    IOPaint 서비스 상태 확인

    Returns: {
        ok: boolean,
        data: {
            service_running: boolean,
            service_url: string
        }
    }
    """
    try:
        from ai.image_inpainter import get_inpainter
        inpainter = get_inpainter()

        is_running = inpainter.check_service()

        return jsonify({
            'ok': True,
            'data': {
                'service_running': is_running,
                'service_url': inpainter.iopaint_url,
                'message': 'IOPaint service is running' if is_running else 'IOPaint service is not running. Start it with: iopaint start --model=lama --device=cpu --port=8090 --host=0.0.0.0'
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Status check error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/api/image/translate', methods=['POST'])
def translate_image_text():
    """
    이미지 내 텍스트 OCR + 번역

    Body: {
        image_url: string  // 이미지 URL
    }

    Returns: {
        ok: boolean,
        data: {
            original_text: string,  // 추출된 원본 텍스트
            translated_text: string,  // 번역된 텍스트
            result_image: string (base64)  // 번역된 텍스트가 오버레이된 이미지
        }
    }
    """
    try:
        data = request.get_json()
        image_url = data.get('image_url')

        if not image_url:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_DATA',
                    'message': 'image_url is required'
                }
            }), 400

        logger.info(f"🔤 Translating image text: {image_url}")

        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))

        # Import dependencies first
        try:
            import easyocr
            import numpy as np
        except ImportError as e:
            logger.error(f"❌ Missing dependency: {str(e)}")
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'DEPENDENCY_ERROR',
                    'message': f'Missing dependency: {str(e)}. Install with: pip install easyocr numpy'
                }
            }), 500

        # Extract text using EasyOCR
        reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)

        # Convert PIL Image to numpy array
        img_array = np.array(image)

        results = reader.readtext(img_array)

        if not results:
            logger.warning("⚠️ No text detected in image")
            return jsonify({
                'ok': True,
                'data': {
                    'original_text': '',
                    'translated_text': '',
                    'result_image': None,
                    'message': 'No text detected in image'
                }
            }), 200

        # Extract text
        original_texts = [result[1] for result in results]
        original_text = '\n'.join(original_texts)

        logger.info(f"📝 Extracted text: {original_text[:100]}...")

        # Translate using existing translation service
        from ai.translator import get_translator
        translator = get_translator()

        translated_texts = []
        for text in original_texts:
            translated = translator.translate(text, source='zh', target='ko')
            translated_texts.append(translated)

        translated_text = '\n'.join(translated_texts)

        logger.info(f"✅ Translated text: {translated_text[:100]}...")

        # Create overlay image with translated text
        draw = ImageDraw.Draw(image)

        # Try to load Korean font (Linux path for Railway)
        try:
            # Try common Linux font paths
            for font_path in [
                "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/System/Library/Fonts/AppleSDGothicNeo.ttc"  # macOS
            ]:
                try:
                    font = ImageFont.truetype(font_path, 30)
                    break
                except:
                    continue
            else:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()

        # Draw translated text at detected positions
        for i, (bbox, text, prob) in enumerate(results):
            if i < len(translated_texts):
                # Get bounding box coordinates
                (top_left, top_right, bottom_right, bottom_left) = bbox
                x, y = int(top_left[0]), int(top_left[1])

                # Draw white background rectangle
                text_bbox = draw.textbbox((x, y), translated_texts[i], font=font)
                draw.rectangle(text_bbox, fill='white')

                # Draw translated text
                draw.text((x, y), translated_texts[i], fill='black', font=font)

        # Convert result image to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'ok': True,
            'data': {
                'original_text': original_text,
                'translated_text': translated_text,
                'result_image': f'data:image/png;base64,{result_base64}'
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Translation error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': 'Internal server error',
                'details': {'error': str(e)}
            }
        }), 500
