"""
Translation API - Translate Chinese text to Korean using Google Translate
"""

from flask import Blueprint, request, jsonify
import urllib.parse
import urllib.request
import json
import ssl

translate_bp = Blueprint('translate', __name__)

@translate_bp.route('/translate', methods=['POST'])
def translate():
    """Translate text from Chinese to Korean"""
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_TEXT',
                    'message': 'Text is required',
                    'details': None
                }
            }), 400

        text = data['text']
        from_lang = data.get('from', 'zh-CN')
        to_lang = data.get('to', 'ko')

        # Use Google Translate's free API
        url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={from_lang}&tl={to_lang}&dt=t&q={urllib.parse.quote(text)}'

        # Create SSL context that doesn't verify certificates (for development)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(url, timeout=10, context=ssl_context) as response:
            result = json.loads(response.read().decode('utf-8'))

            # Extract translated text from response
            # Response format: [[[translated, original, null, null, 3]], null, from, ...]
            if result and len(result) > 0 and len(result[0]) > 0 and len(result[0][0]) > 0:
                translated = result[0][0][0]

                return jsonify({
                    'ok': True,
                    'data': {
                        'translated': translated,
                        'original': text,
                        'from': from_lang,
                        'to': to_lang
                    }
                })
            else:
                raise Exception('Invalid translation response format')

    except Exception as e:
        print(f'Translation error: {str(e)}')
        return jsonify({
            'ok': False,
            'error': {
                'code': 'TRANSLATION_ERROR',
                'message': str(e),
                'details': None
            }
        }), 500
