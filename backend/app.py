"""
BuyPilot Backend API
Flask application with CORS, JWT auth, and route blueprints
"""
import os
import atexit
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import route blueprints
from routes.orders import bp as orders_bp
from routes.purchase import bp as purchase_bp
from routes.forward import bp as forward_bp
from routes.webhooks import bp as webhooks_bp
from routes.products import bp as products_bp
from routes.discovery import bp as discovery_bp
from routes.image_edit import bp as image_edit_bp
from routes.competitor import bp as competitor_bp
from routes.auth import bp as auth_bp
from routes.smartstore import bp as smartstore_bp

# Import scheduler
from workers.scheduler import init_scheduler, shutdown_scheduler

# Initialize Flask app with static file serving
app = Flask(__name__, static_folder='storage', static_url_path='/static')

# Initialize background scheduler
init_scheduler()

# Register shutdown handler
atexit.register(shutdown_scheduler)

# Configure CORS
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Idempotency-Key"]
    }
})

# App configuration
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-secret-key')
app.config['JSON_SORT_KEYS'] = False

# Register blueprints
app.register_blueprint(orders_bp, url_prefix='/api/v1')
app.register_blueprint(purchase_bp, url_prefix='/api/v1')
app.register_blueprint(forward_bp, url_prefix='/api/v1')
app.register_blueprint(webhooks_bp, url_prefix='/api/v1')
app.register_blueprint(products_bp, url_prefix='/api/v1')
app.register_blueprint(discovery_bp, url_prefix='/api/v1')
app.register_blueprint(image_edit_bp)
app.register_blueprint(competitor_bp, url_prefix='/api/v1')
app.register_blueprint(auth_bp, url_prefix='/api/v1')
app.register_blueprint(smartstore_bp, url_prefix='/api/v1')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Railway/monitoring"""
    return jsonify({
        'ok': True,
        'status': 'healthy',
        'service': 'buypilot-backend'
    }), 200

# Debug endpoint to list all registered routes
@app.route('/debug/routes', methods=['GET'])
def debug_routes():
    """List all registered routes for debugging"""
    import sys
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'path': str(rule)
        })
    return jsonify({
        'ok': True,
        'python_version': sys.version,
        'total_routes': len(routes),
        'routes': sorted(routes, key=lambda x: x['path'])
    }), 200

# Test endpoint to verify deployment
@app.route('/test-extension-endpoint', methods=['GET'])
def test_extension_endpoint():
    """Test endpoint to verify latest code is deployed"""
    return jsonify({
        'ok': True,
        'message': 'Extension endpoint is available!',
        'timestamp': '2025-10-28-14:40',
        'endpoint': '/api/v1/products/import-from-extension'
    }), 200

# IP address check endpoint
@app.route('/debug/ip', methods=['GET'])
def debug_ip():
    """Check Railway server's outbound IP address"""
    import requests
    try:
        # Get outbound IP from external service
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        outbound_ip = response.json().get('ip', 'unknown')

        return jsonify({
            'ok': True,
            'outbound_ip': outbound_ip,
            'client_ip': request.remote_addr,
            'x_forwarded_for': request.headers.get('X-Forwarded-For', 'not set'),
            'message': f'Add this IP to Naver Commerce API whitelist: {outbound_ip}'
        }), 200
    except Exception as e:
        return jsonify({
            'ok': False,
            'error': str(e),
            'client_ip': request.remote_addr
        }), 500

# Proxy to Next.js frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def proxy_to_frontend(path):
    """Proxy non-API requests to Next.js frontend"""
    import requests
    from flask import request as flask_request

    # Only proxy if not an API endpoint
    if path.startswith('api/'):
        return jsonify({'ok': False, 'error': 'Not found'}), 404

    try:
        # Proxy to Next.js on port 3000
        frontend_url = f"http://localhost:3000/{path}"

        # Add query string if present
        if flask_request.query_string:
            frontend_url += f"?{flask_request.query_string.decode('utf-8')}"

        # Forward the request with timeout
        resp = requests.request(
            method=flask_request.method,
            url=frontend_url,
            headers={key: value for (key, value) in flask_request.headers if key != 'Host'},
            data=flask_request.get_data(),
            cookies=flask_request.cookies,
            allow_redirects=False,
            timeout=10
        )

        # Return the response
        from flask import Response
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]

        return Response(resp.content, resp.status_code, headers)
    except requests.exceptions.ConnectionError as e:
        app.logger.error(f"Cannot connect to Next.js: {str(e)}")
        return jsonify({
            'ok': False,
            'error': 'Frontend service unavailable',
            'message': 'Next.js is not responding'
        }), 503
    except requests.exceptions.Timeout as e:
        app.logger.error(f"Next.js timeout: {str(e)}")
        return jsonify({
            'ok': False,
            'error': 'Frontend timeout',
            'message': 'Next.js took too long to respond'
        }), 504
    except Exception as e:
        app.logger.error(f"Proxy error: {str(e)}")
        return jsonify({
            'ok': True,
            'service': 'BuyPilot API',
            'frontend': 'Connect to port 3000 directly for frontend',
            'error_detail': str(e)
        }), 200

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'ok': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'The requested resource was not found',
            'details': {}
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'ok': False,
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'An internal server error occurred',
            'details': {}
        }
    }), 500

@app.errorhandler(Exception)
def handle_exception(error):
    """Handle all other exceptions"""
    app.logger.error(f'Unhandled exception: {str(error)}')
    return jsonify({
        'ok': False,
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'An unexpected error occurred',
            'details': {'error': str(error)} if app.debug else {}
        }
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4070))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
