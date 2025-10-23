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

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API info"""
    return jsonify({
        'ok': True,
        'service': 'BuyPilot API',
        'version': 'v1',
        'endpoints': {
            'health': '/health',
            'orders': '/api/v1/orders',
            'products': '/api/v1/products',
            'import_product': '/api/v1/products/import',
            'purchase': '/api/v1/orders/{id}/actions/execute-purchase',
            'forward': '/api/v1/orders/{id}/actions/send-to-forwarder',
            'webhooks': '/api/v1/webhooks/{supplier|forwarder}'
        }
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
