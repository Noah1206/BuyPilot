"""
Authentication Routes
Login, Register, Logout endpoints
"""

from flask import Blueprint, request, jsonify
import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
import psycopg2
from models.user import User

bp = Blueprint('auth', __name__)

# Database connection helper
def get_db_connection():
    return psycopg2.connect(os.getenv('SUPABASE_DB_URL'))

# JWT secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production')

# Auth decorator
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'ok': False, 'error': 'Missing token'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_id = data['user_id']
        except:
            return jsonify({'ok': False, 'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated


@bp.route('/auth/register', methods=['POST'])
def register():
    """
    Register new user
    Body: { email, password, name }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')

        if not email or not password or not name:
            return jsonify({'ok': False, 'error': 'Missing required fields'}), 400

        conn = get_db_connection()
        User.create_table(conn)

        # Check if user exists
        existing = User.find_by_email(conn, email)
        if existing:
            conn.close()
            return jsonify({'ok': False, 'error': 'Email already registered'}), 400

        # Create new user
        user = User(email=email, name=name)
        user.set_password(password)
        user.save(conn)
        conn.close()

        # Generate token
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'ok': True,
            'user': user.to_dict(),
            'token': token
        }), 201

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@bp.route('/auth/login', methods=['POST'])
def login():
    """
    Login user
    Body: { email, password }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'ok': False, 'error': 'Missing email or password'}), 400

        conn = get_db_connection()
        user = User.find_by_email(conn, email)
        conn.close()

        if not user or not user.check_password(password):
            return jsonify({'ok': False, 'error': 'Invalid credentials'}), 401

        # Generate token
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'ok': True,
            'user': user.to_dict(),
            'token': token
        }), 200

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@bp.route('/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current logged in user"""
    try:
        conn = get_db_connection()
        user = User.find_by_id(conn, request.user_id)
        conn.close()

        if not user:
            return jsonify({'ok': False, 'error': 'User not found'}), 404

        return jsonify({'ok': True, 'user': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500
