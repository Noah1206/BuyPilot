"""
Products API routes
Handles product import from Taobao, CRUD operations
RapidAPI Mode: API integration + AI translation + Image download
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from sqlalchemy import desc
import logging

from models import get_db, Product
from connectors.taobao_api import get_taobao_connector
from connectors.taobao_scraper import get_taobao_scraper
from connectors.taobao_rapidapi import get_taobao_rapidapi
from ai.translator import get_translator
from services.image_service import get_image_service

bp = Blueprint('products', __name__)
logger = logging.getLogger(__name__)


@bp.route('/products/import', methods=['POST'])
def import_product():
    """
    Import product from Taobao URL - RapidAPI Mode
    Features:
    - RapidAPI integration (reliable, no bot detection)
    - AI translation (Chinese → Korean)
    - Image download and optimization

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

        # Detect platform (Taobao vs Tmall)
        is_tmall = 'tmall.com' in url.lower()
        platform_name = 'Tmall' if is_tmall else 'Taobao'

        logger.info(f"🔍 [{platform_name}] Importing product from URL: {url}")

        # Hybrid approach: RapidAPI for Taobao, Scraper for Tmall
        if is_tmall:
            # Tmall: Use HeySeller scraper (RapidAPI doesn't support Tmall)
            logger.info("📌 Using HeySeller scraper for Tmall product")
            scraper = get_taobao_scraper()
            product_id = scraper.parse_product_url(url)

            if not product_id:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'INVALID_URL',
                        'message': 'Could not extract product ID from Tmall URL',
                        'details': {'url': url}
                    }
                }), 400

            logger.info(f"✅ Extracted Tmall product ID: {product_id}")

            # Check if product already exists
            with get_db() as db:
                existing = db.query(Product).filter(
                    Product.data['taobao_item_id'].astext == product_id
                ).first()

                if existing:
                    logger.warning(f"⚠️ Tmall product {product_id} already exists")
                    return jsonify({
                        'ok': True,
                        'data': {
                            'product_id': str(existing.id),
                            'already_exists': True,
                            'message': 'Product already imported',
                            'product': existing.to_dict()
                        }
                    }), 200

            # Step 1: Fetch product using scraper
            logger.info("📥 Step 1/3: Fetching Tmall product using HeySeller scraper...")
            product_info = scraper.scrape_product(url)

            if not product_info:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'SCRAPER_ERROR',
                        'message': 'Failed to scrape Tmall product information',
                        'details': {'product_id': product_id, 'url': url}
                    }
                }), 500

        else:
            # Taobao: Use RapidAPI
            logger.info("📌 Using RapidAPI for Taobao product")
            rapidapi = get_taobao_rapidapi()
            product_id = rapidapi.parse_product_url(url)

            if not product_id:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'INVALID_URL',
                        'message': 'Could not extract product ID from Taobao URL',
                        'details': {'url': url}
                    }
                }), 400

            logger.info(f"✅ Extracted Taobao product ID: {product_id}")

            # Check if product already exists
            with get_db() as db:
                existing = db.query(Product).filter(
                    Product.data['taobao_item_id'].astext == product_id
                ).first()

                if existing:
                    logger.warning(f"⚠️ Taobao product {product_id} already exists")
                    return jsonify({
                        'ok': True,
                        'data': {
                            'product_id': str(existing.id),
                            'already_exists': True,
                            'message': 'Product already imported',
                            'product': existing.to_dict()
                        }
                    }), 200

            # Step 1: Fetch product from RapidAPI
            logger.info("📥 Step 1/3: Fetching Taobao product from RapidAPI...")
            product_info = rapidapi.get_product_detail(product_id)

            if not product_info:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'API_ERROR',
                        'message': 'Failed to fetch product information from RapidAPI',
                        'details': {'product_id': product_id}
                    }
                }), 500

        logger.info(f"✅ Fetched product: {product_info.get('title', '')[:50]}...")

        # Step 2: Translate to Korean
        logger.info("🌐 Step 2/3: Translating to Korean...")
        translator = get_translator()
        product_info = translator.translate_product(product_info)
        logger.info("✅ Translation completed")

        # Step 3: Download images
        logger.info("📷 Step 3/3: Downloading images...")
        image_service = get_image_service()

        downloaded_images = []
        if product_info.get('images'):
            downloaded_images = image_service.download_images(
                product_info['images'],
                optimize=True,
                max_images=5  # Limit to 5 images
            )

        # Use first downloaded image as main image
        main_image_path = downloaded_images[0] if downloaded_images else None
        main_image_url = image_service.get_public_url(main_image_path) if main_image_path else product_info.get('pic_url', '')

        logger.info(f"✅ Downloaded {len(downloaded_images)} images")

        # Create product in database
        with get_db() as db:
            product = Product(
                source=product_info.get('source', 'taobao'),
                source_url=url,
                supplier_id=product_info.get('seller_nick', ''),
                title=product_info.get('title', ''),  # Korean translated title
                price=product_info.get('price', 0),
                currency='CNY',  # Taobao uses Chinese Yuan
                stock=product_info.get('num', 0),
                image_url=main_image_url,
                score=product_info.get('score', 0),
                data={
                    # IDs
                    'taobao_item_id': product_info.get('taobao_item_id', ''),

                    # Original Chinese content
                    'title_cn': product_info.get('title_cn', product_info.get('title', '')),
                    'desc_cn': product_info.get('desc_cn', product_info.get('desc', '')),

                    # Korean translations
                    'title_kr': product_info.get('title_kr', ''),
                    'desc_kr': product_info.get('desc_kr', ''),

                    # Seller info
                    'seller_nick': product_info.get('seller_nick', ''),

                    # Images
                    'pic_url': product_info.get('pic_url', ''),
                    'images': product_info.get('images', []),
                    'downloaded_images': [image_service.get_public_url(img) for img in downloaded_images],

                    # Additional info
                    'location': product_info.get('location', ''),
                    'cid': product_info.get('cid', ''),
                    'props': product_info.get('props', ''),
                    'modified': product_info.get('modified', ''),

                    # Processing info
                    'translated': product_info.get('translated', False),
                    'translation_provider': product_info.get('translation_provider', ''),
                    'imported_at': datetime.utcnow().isoformat(),
                    'import_method': 'rapidapi' if not is_tmall else 'heyseller_scraper',
                    'platform': platform_name
                }
            )

            db.add(product)
            db.commit()

            logger.info(f"✅ Product imported successfully: {product.id}")

            return jsonify({
                'ok': True,
                'data': {
                    'product_id': str(product.id),
                    'message': f'Product imported successfully ({platform_name} - {"RapidAPI" if not is_tmall else "HeySeller Scraper"})',
                    'features': {
                        'method': 'rapidapi' if not is_tmall else 'heyseller_scraper',
                        'platform': platform_name,
                        'translated': product_info.get('translated', False),
                        'images_downloaded': len(downloaded_images)
                    },
                    'product': product.to_dict()
                }
            }), 201

    except Exception as e:
        logger.error(f"❌ Error importing product: {str(e)}", exc_info=True)
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
