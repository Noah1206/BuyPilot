"""
JWT Authentication utilities
"""
import os
import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta


def generate_token(user_id: str, expires_in: int = 86400) -> str:
    """
    Generate JWT token
    Args:
        user_id: User identifier
        expires_in: Token expiration in seconds (default 24h)
    """
    secret = os.getenv('JWT_SECRET', 'dev-secret-key')
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def decode_token(token: str) -> dict:
    """
    Decode and verify JWT token
    Returns payload if valid, raises exception if invalid
    """
    secret = os.getenv('JWT_SECRET', 'dev-secret-key')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError('Token has expired')
    except jwt.InvalidTokenError:
        raise ValueError('Invalid token')


def require_auth(f):
    """
    Decorator to require JWT authentication on routes
    Usage: @require_auth
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Missing or invalid Authorization header',
                    'details': {}
                }
            }), 401

        token = auth_header.split(' ')[1]

        try:
            payload = decode_token(token)
            # Add user info to request context
            request.user_id = payload['user_id']
            return f(*args, **kwargs)

        except ValueError as e:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': str(e),
                    'details': {}
                }
            }), 401

    return decorated_function


def create_demo_token() -> str:
    """Create demo token for testing (admin user)"""
    return generate_token('admin-001', expires_in=86400 * 365)  # 1 year for demo
