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

# Import scheduler
from workers.scheduler import init_scheduler, shutdown_scheduler

# Initialize Flask app
app = Flask(__name__)

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

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Railway/monitoring"""
    return jsonify({
        'ok': True,
        'status': 'healthy',
        'service': 'buypilot-backend'
    }), 200

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
        frontend_url = f"http://127.0.0.1:3000/{path}"

        # Forward the request
        resp = requests.request(
            method=flask_request.method,
            url=frontend_url,
            headers={key: value for (key, value) in flask_request.headers if key != 'Host'},
            data=flask_request.get_data(),
            cookies=flask_request.cookies,
            allow_redirects=False
        )

        # Return the response
        from flask import Response
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]

        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        app.logger.error(f"Proxy error: {str(e)}")
        return jsonify({
            'ok': True,
            'service': 'BuyPilot API',
            'frontend': 'Connect to port 3000 directly for frontend'
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
