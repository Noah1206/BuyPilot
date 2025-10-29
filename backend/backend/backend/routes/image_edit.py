"""
Image Editing API Routes
AI 이미지 인페인팅 (배경 제거, 객체 제거)
"""
from flask import Blueprint, request, jsonify
import logging

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
