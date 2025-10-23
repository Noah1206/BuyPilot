"""
Products API routes
Handles product import from Taobao, CRUD operations
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from sqlalchemy import desc
import logging

from models import get_db, Product
from connectors.taobao_api import get_taobao_connector

bp = Blueprint('products', __name__)
logger = logging.getLogger(__name__)


@bp.route('/products/import', methods=['POST'])
def import_product():
    """
    Import product from Taobao URL
    Body: {url: string}
    Returns: {ok: bool, data: {product_id, ...}}
    """
    try:
        data = request.get_json(force=True)

        # Validate URL
        url = data.get('url')
        if not url:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: url',
                    'details': {}
                }
            }), 400

        logger.info(f"🔍 Importing product from URL: {url}")

        # Get Taobao connector
        try:
            taobao = get_taobao_connector()
        except ValueError as e:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'CONFIG_ERROR',
                    'message': 'Taobao API credentials not configured',
                    'details': {'error': str(e)}
                }
            }), 500

        # Parse product ID from URL
        product_id = taobao.parse_product_url(url)
        if not product_id:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'INVALID_URL',
                    'message': 'Could not extract product ID from URL',
                    'details': {'url': url}
                }
            }), 400

        logger.info(f"✅ Extracted product ID: {product_id}")

        # Check if product already exists
        with get_db() as db:
            existing = db.query(Product).filter(
                Product.data['taobao_item_id'].astext == product_id
            ).first()

            if existing:
                logger.warning(f"⚠️ Product {product_id} already exists")
                return jsonify({
                    'ok': True,
                    'data': {
                        'product_id': str(existing.id),
                        'already_exists': True,
                        'message': 'Product already imported',
                        'product': existing.to_dict()
                    }
                }), 200

        # Fetch product info from Taobao
        product_info = taobao.get_product_info(product_id)
        if not product_info:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'FETCH_ERROR',
                    'message': 'Failed to fetch product information from Taobao',
                    'details': {'product_id': product_id}
                }
            }), 500

        logger.info(f"✅ Fetched product info: {product_info.get('title', '')[:50]}...")

        # Create product in database
        with get_db() as db:
            product = Product(
                source='taobao',
                source_url=url,
                supplier_id=product_info.get('seller_nick', ''),
                title=product_info.get('title', ''),
                price=product_info.get('price', 0),
                currency='CNY',  # Taobao uses Chinese Yuan
                stock=product_info.get('num', 0),
                image_url=product_info.get('main_image', ''),
                score=product_info.get('score', 0),
                data={
                    'taobao_item_id': product_info.get('taobao_item_id', ''),
                    'seller_nick': product_info.get('seller_nick', ''),
                    'pic_url': product_info.get('pic_url', ''),
                    'images': product_info.get('images', []),
                    'desc': product_info.get('desc', ''),
                    'location': product_info.get('location', ''),
                    'cid': product_info.get('cid', ''),
                    'props': product_info.get('props', ''),
                    'modified': product_info.get('modified', ''),
                    'imported_at': datetime.utcnow().isoformat()
                }
            )

            db.add(product)
            db.commit()

            logger.info(f"✅ Product imported successfully: {product.id}")

            return jsonify({
                'ok': True,
                'data': {
                    'product_id': str(product.id),
                    'message': 'Product imported successfully',
                    'product': product.to_dict()
                }
            }), 201

    except Exception as e:
        logger.error(f"❌ Error importing product: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to import product',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products', methods=['GET'])
def get_products():
    """
    Get list of products with optional filtering
    Query params: source, limit, offset, search
    """
    source_filter = request.args.get('source')
    search_query = request.args.get('search')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))

    try:
        with get_db() as db:
            # Build query
            query = db.query(Product)

            # Apply filters
            if source_filter:
                query = query.filter(Product.source == source_filter)

            if search_query:
                # Search in title
                query = query.filter(Product.title.ilike(f'%{search_query}%'))

            # Get total count
            total = query.count()

            # Sort by created_at desc and paginate
            products = query.order_by(desc(Product.created_at))\
                           .limit(limit)\
                           .offset(offset)\
                           .all()

            # Convert to dict
            products_data = [product.to_dict() for product in products]

            return jsonify({
                'ok': True,
                'data': {
                    'products': products_data,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error fetching products: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch products',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get single product by ID"""
    try:
        with get_db() as db:
            product = db.query(Product).filter(Product.id == product_id).first()

            if not product:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'PRODUCT_NOT_FOUND',
                        'message': f'Product {product_id} not found',
                        'details': {}
                    }
                }), 404

            return jsonify({
                'ok': True,
                'data': product.to_dict()
            }), 200

    except Exception as e:
        logger.error(f"❌ Error fetching product: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch product',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    """
    Update product
    Body: {title?, price?, stock?, image_url?, data?}
    """
    try:
        data = request.get_json(force=True)

        with get_db() as db:
            product = db.query(Product).filter(Product.id == product_id).first()

            if not product:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'PRODUCT_NOT_FOUND',
                        'message': f'Product {product_id} not found',
                        'details': {}
                    }
                }), 404

            # Update allowed fields
            if 'title' in data:
                product.title = data['title']

            if 'price' in data:
                product.price = data['price']

            if 'stock' in data:
                product.stock = data['stock']

            if 'image_url' in data:
                product.image_url = data['image_url']

            if 'data' in data:
                # Merge with existing data
                if not product.data:
                    product.data = {}
                product.data.update(data['data'])

            product.updated_at = datetime.utcnow()

            db.commit()

            logger.info(f"✅ Product updated: {product_id}")

            return jsonify({
                'ok': True,
                'data': {
                    'product_id': str(product.id),
                    'message': 'Product updated successfully',
                    'product': product.to_dict()
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error updating product: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to update product',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete product"""
    try:
        with get_db() as db:
            product = db.query(Product).filter(Product.id == product_id).first()

            if not product:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'PRODUCT_NOT_FOUND',
                        'message': f'Product {product_id} not found',
                        'details': {}
                    }
                }), 404

            db.delete(product)
            db.commit()

            logger.info(f"✅ Product deleted: {product_id}")

            return jsonify({
                'ok': True,
                'data': {
                    'product_id': product_id,
                    'message': 'Product deleted successfully'
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error deleting product: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to delete product',
                'details': {'error': str(e)}
            }
        }), 500
