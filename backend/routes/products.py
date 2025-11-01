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
import os
from werkzeug.utils import secure_filename
from PIL import Image
import io

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

            # Step 1: Fetch product from RapidAPI (with HeySeller fallback)
            logger.info("📥 Step 1/3: Fetching Taobao product from RapidAPI...")
            product_info = rapidapi.get_product_info(product_id)

            # Fallback to HeySeller scraper if RapidAPI fails
            if not product_info:
                logger.warning("⚠️ RapidAPI failed, falling back to HeySeller scraper...")
                scraper = TaobaoScraper()
                product_info = scraper.scrape_product(url)

            if not product_info:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'SCRAPER_ERROR',
                        'message': 'Failed to fetch product information from both RapidAPI and HeySeller scraper',
                        'details': {'product_id': product_id}
                    }
                }), 500

        logger.info(f"✅ Fetched product: {product_info.get('title', '')[:50]}...")

        # Step 2: Translate to Korean (optional - continue if fails)
        logger.info("🌐 Step 2/3: Translating to Korean...")
        try:
            translator = get_translator()
            product_info = translator.translate_product(product_info)
            logger.info("✅ Translation completed")
        except Exception as e:
            logger.warning(f"⚠️ Translation failed (continuing without translation): {str(e)}")
            # Continue without translation
            product_info['translated'] = False
            product_info['translation_error'] = str(e)

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

        # Step 3.5: Download option images (if not already downloaded by scraper)
        if product_info.get('options'):
            logger.info("🎨 Downloading option images...")
            option_images_downloaded = 0
            for option in product_info['options']:
                for value in option.get('values', []):
                    # Check if image needs to be downloaded (external URL, not already on our server)
                    if value.get('image') and not value['image'].startswith('/static/') and not 'railway.app' in value['image']:
                        try:
                            local_path = image_service.download_image(value['image'], optimize=True, max_size=(200, 200))
                            if local_path:
                                value['image'] = image_service.get_public_url(local_path)
                                option_images_downloaded += 1
                                logger.info(f"✅ Downloaded option image: {value['image']}")
                        except Exception as e:
                            logger.warning(f"⚠️ Option image download failed: {str(e)}")
                            # Keep original URL as fallback

            if option_images_downloaded > 0:
                logger.info(f"✅ Downloaded {option_images_downloaded} option images")

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

                    # Product specifications and options
                    'specifications': product_info.get('specifications', []),
                    'options': product_info.get('options', []),
                    'variants': product_info.get('variants', []),

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

            # Handle image_url (accept base64 directly)
            if 'image_url' in data:
                product.image_url = data['image_url']
                logger.info(f"✅ Main image updated")

            if 'data' in data:
                # Merge with existing data
                if not product.data:
                    product.data = {}

                update_data = data['data']

                # Handle images array (accept base64 directly)
                if 'images' in update_data and isinstance(update_data['images'], list):
                    base64_count = sum(1 for img in update_data['images'] if img and img.startswith('data:image'))
                    logger.info(f"✅ Updated {len(update_data['images'])} images ({base64_count} base64, {len(update_data['images']) - base64_count} URLs)")
                    # Log first image type for debugging
                    if len(update_data['images']) > 0:
                        first_img = update_data['images'][0]
                        logger.info(f"📝 First image type: {'base64' if first_img.startswith('data:image') else 'URL'} ({len(first_img)} chars)")

                # Handle desc_imgs array (accept base64 directly)
                if 'desc_imgs' in update_data and isinstance(update_data['desc_imgs'], list):
                    base64_count = sum(1 for img in update_data['desc_imgs'] if img and img.startswith('data:image'))
                    logger.info(f"✅ Updated {len(update_data['desc_imgs'])} detail images ({base64_count} base64, {len(update_data['desc_imgs']) - base64_count} URLs)")

                # Handle thumbnail and detail images separately
                if 'thumbnail_image_url' in update_data:
                    product.data['thumbnail_image_url'] = update_data['thumbnail_image_url']
                    logger.info(f"✅ Updated thumbnail image for product {product_id}")

                if 'detail_image_url' in update_data:
                    product.data['detail_image_url'] = update_data['detail_image_url']
                    logger.info(f"✅ Updated detail image for product {product_id}")

                # Merge other data (exclude thumbnail/detail to avoid duplication)
                product.data.update({k: v for k, v in update_data.items()
                                   if k not in ['thumbnail_image_url', 'detail_image_url']})

                # Mark JSONB field as modified for SQLAlchemy to detect changes
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(product, 'data')

            product.updated_at = datetime.utcnow()

            db.commit()

            # Verify what was saved to database
            if product.data and 'images' in product.data:
                saved_images = product.data['images']
                if isinstance(saved_images, list) and len(saved_images) > 0:
                    first_saved = saved_images[0]
                    is_base64 = first_saved.startswith('data:image') if first_saved else False
                    logger.info(f"✅ Product updated: {product_id}")
                    logger.info(f"📦 Saved to DB: {len(saved_images)} images, first is {'base64' if is_base64 else 'URL'} ({len(first_saved)} chars)")
                else:
                    logger.info(f"✅ Product updated: {product_id} (no images in data)")
            else:
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


@bp.route('/products/import-from-extension', methods=['POST'])
def import_from_extension():
    """
    Import product from Chrome Extension
    Extension sends already-extracted product data from Taobao page

    Body: {
        source: 'taobao',
        taobao_item_id: string,
        source_url: string,
        title: string,
        price: number,
        images: string[],
        options: array,
        ...
    }
    Returns: {ok: bool, data: {product_id, ...}}
    """
    try:
        data = request.get_json(force=True)

        logger.info(f"📦 Extension import request: {data.get('taobao_item_id')}")

        # Validate required fields
        required = ['taobao_item_id', 'source_url', 'title']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Missing required fields: {", ".join(missing)}',
                    'details': {}
                }
            }), 400

        product_id = data.get('taobao_item_id')

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

        # Translate to Korean (optional - continue if fails)
        logger.info("🌐 Translating to Korean...")
        try:
            translator = get_translator()
            data = translator.translate_product(data)
            logger.info("✅ Translation completed")
        except Exception as e:
            logger.warning(f"⚠️ Translation failed (continuing without translation): {str(e)}")
            data['translated'] = False
            data['translation_error'] = str(e)

        # Download main product images (대표 이미지)
        logger.info("📷 Downloading main product images...")
        image_service = get_image_service()

        downloaded_images = []
        if data.get('images'):
            downloaded_images = image_service.download_images(
                data['images'],
                optimize=True,
                max_images=10  # Increased from 5 to 10
            )

        main_image_path = downloaded_images[0] if downloaded_images else None
        main_image_url = image_service.get_public_url(main_image_path) if main_image_path else data.get('pic_url', '')

        logger.info(f"✅ Downloaded {len(downloaded_images)} main images")

        # Download description/detail images (상세페이지 이미지)
        downloaded_desc_images = []
        if data.get('desc_imgs'):
            logger.info(f"📷 Downloading {len(data['desc_imgs'])} description images...")
            try:
                downloaded_desc_images = image_service.download_images(
                    data['desc_imgs'],
                    optimize=True,
                    max_images=20  # Allow more detail images
                )
                logger.info(f"✅ Downloaded {len(downloaded_desc_images)} description images")
            except Exception as e:
                logger.warning(f"⚠️ Failed to download description images: {str(e)}")

        # Download option images
        if data.get('options'):
            logger.info("🎨 Downloading option images...")
            option_images_downloaded = 0
            for option in data['options']:
                for value in option.get('values', []):
                    if value.get('image') and not value['image'].startswith('/static/') and 'railway.app' not in value['image']:
                        try:
                            local_path = image_service.download_image(value['image'], optimize=True, max_size=(200, 200))
                            if local_path:
                                value['image'] = image_service.get_public_url(local_path)
                                option_images_downloaded += 1
                        except Exception as e:
                            logger.warning(f"⚠️ Option image download failed: {str(e)}")

            if option_images_downloaded > 0:
                logger.info(f"✅ Downloaded {option_images_downloaded} option images")

        # Create product in database
        with get_db() as db:
            product = Product(
                source=data.get('source', 'taobao'),
                source_url=data.get('source_url'),
                supplier_id=data.get('seller_nick', ''),
                title=data.get('title', ''),
                price=data.get('price', 0),
                currency=data.get('currency', 'CNY'),
                stock=data.get('stock', 0),
                image_url=main_image_url,
                score=data.get('score', 0),
                data={
                    'taobao_item_id': data.get('taobao_item_id', ''),
                    'title_cn': data.get('title_cn', data.get('title', '')),
                    'desc_cn': data.get('desc_cn', data.get('desc', '')),
                    'title_kr': data.get('title_kr', ''),
                    'desc_kr': data.get('desc_kr', ''),
                    'seller_nick': data.get('seller_nick', ''),
                    'pic_url': data.get('pic_url', ''),
                    'images': data.get('images', []),
                    'downloaded_images': [image_service.get_public_url(img) for img in downloaded_images],
                    'desc_imgs': data.get('desc_imgs', []),  # Original URLs
                    'downloaded_desc_imgs': [image_service.get_public_url(img) for img in downloaded_desc_images],  # Downloaded URLs
                    'location': data.get('location', ''),
                    'specifications': data.get('specifications', []),
                    'options': data.get('options', []),
                    'variants': data.get('variants', []),
                    'weight': data.get('weight'),  # Product weight in kg (extracted from Taobao page)
                    'translated': data.get('translated', False),
                    'translation_provider': data.get('translation_provider', ''),
                    'imported_at': datetime.utcnow().isoformat(),
                    'import_method': 'chrome_extension',
                    'platform': 'Taobao'
                }
            )

            db.add(product)
            db.commit()

            logger.info(f"✅ Product imported from extension: {product.id}")

            return jsonify({
                'ok': True,
                'data': {
                    'product_id': str(product.id),
                    'message': 'Product imported successfully from Chrome Extension',
                    'features': {
                        'method': 'chrome_extension',
                        'translated': data.get('translated', False),
                        'images_downloaded': len(downloaded_images)
                    },
                    'product': product.to_dict()
                }
            }), 201

    except Exception as e:
        logger.error(f"❌ Error importing from extension: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to import product from extension',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products/<product_id>/upload-image', methods=['POST'])
def upload_edited_image(product_id):
    """
    Upload edited image from ImageEditor
    Expects multipart/form-data with 'image' field containing PNG blob
    """
    try:
        # Validate product exists
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

        # Check if file is present
        if 'image' not in request.files:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'NO_FILE',
                    'message': 'No image file provided',
                    'details': {}
                }
            }), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'EMPTY_FILENAME',
                    'message': 'Empty filename',
                    'details': {}
                }
            }), 400

        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"edited_{product_id}_{timestamp}.png"

        # Ensure storage directory exists
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage', 'images')
        os.makedirs(storage_dir, exist_ok=True)

        # Save file
        filepath = os.path.join(storage_dir, filename)

        # Optimize image before saving
        image = Image.open(file.stream)

        # Convert RGBA to RGB if necessary (for JPEG compatibility)
        if image.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])  # Use alpha channel as mask
            image = background

        # Optimize and save
        image.save(filepath, 'PNG', optimize=True, quality=85)

        logger.info(f"✅ Saved edited image: {filename}")

        # Generate public URL
        image_service = get_image_service()
        public_url = image_service.get_public_url(f"images/{filename}")

        # Update product with new image URL
        with get_db() as db:
            product = db.query(Product).filter(Product.id == product_id).first()
            product.image_url = public_url
            product.updated_at = datetime.utcnow()

            # Add to downloaded_images array in data
            if not product.data:
                product.data = {}
            if 'downloaded_images' not in product.data:
                product.data['downloaded_images'] = []

            product.data['downloaded_images'].insert(0, public_url)  # Add at beginning

            db.commit()

            logger.info(f"✅ Updated product {product_id} with edited image")

            return jsonify({
                'ok': True,
                'data': {
                    'image_url': public_url,
                    'filename': filename,
                    'message': 'Image uploaded successfully'
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error uploading image: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'UPLOAD_ERROR',
                'message': 'Failed to upload image',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/products/bulk-import', methods=['POST'])
def bulk_import():
    """
    Bulk import products from Excel data

    Body: {
        products: [
            {
                taobao_url: string,
                category_id?: string,
                shipping_cost?: number,
                margin?: number,
                weight?: number,
                customs_rate?: number,
                vat_rate?: number,
                memo?: string
            }
        ],
        use_ai_category?: boolean
    }

    Returns: {ok: bool, data: {summary, results}}
    """
    try:
        data = request.get_json(force=True)
        products_data = data.get('products', [])
        use_ai_category = data.get('use_ai_category', True)

        if not products_data or len(products_data) == 0:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'No products provided',
                    'details': {}
                }
            }), 400

        logger.info(f"📦 Starting bulk import for {len(products_data)} products")

        # Initialize AI category analyzer if needed
        category_analyzer = None
        naver_categories = None

        if use_ai_category:
            try:
                from ai.category_analyzer import get_category_analyzer
                import json

                category_analyzer = get_category_analyzer()

                # Load Naver categories from JSON file
                categories_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'naver_categories.json')
                with open(categories_file, 'r', encoding='utf-8') as f:
                    categories_data = json.load(f)
                    naver_categories = categories_data.get('categories', [])

                logger.info(f"✅ AI category analyzer initialized with {len(naver_categories)} categories")
            except Exception as e:
                logger.warning(f"⚠️ AI category analyzer initialization failed: {str(e)}")
                use_ai_category = False

        # Results tracking
        results = []
        success_count = 0
        failed_count = 0
        manual_category_count = 0
        ai_category_count = 0

        # Get connectors
        taobao_api = get_taobao_rapidapi()
        translator = get_translator()
        image_service = get_image_service()

        # Process each product
        for idx, item in enumerate(products_data):
            try:
                taobao_url = item.get('taobao_url', '').strip()

                if not taobao_url:
                    results.append({
                        'index': idx,
                        'success': False,
                        'error': 'Missing taobao_url'
                    })
                    failed_count += 1
                    continue

                logger.info(f"🔄 ({idx + 1}/{len(products_data)}) Processing: {taobao_url}")

                # Step 1: Fetch product data from Taobao
                product_data = taobao_api.get_product_details(taobao_url)

                if not product_data:
                    results.append({
                        'index': idx,
                        'success': False,
                        'error': 'Failed to fetch product from Taobao'
                    })
                    failed_count += 1
                    continue

                # Step 2: Translate title and description
                if product_data.get('title'):
                    product_data['title'] = translator.translate(product_data['title'])

                if product_data.get('description'):
                    product_data['description'] = translator.translate(product_data['description'])

                # Step 3: Download images
                downloaded_images = []
                if product_data.get('images'):
                    for img_url in product_data['images'][:10]:  # Max 10 images
                        try:
                            local_path = image_service.download_and_optimize(img_url)
                            if local_path:
                                downloaded_images.append(local_path)
                        except Exception as img_error:
                            logger.warning(f"⚠️ Failed to download image {img_url}: {str(img_error)}")

                if downloaded_images:
                    product_data['downloaded_images'] = downloaded_images

                # Step 4: Category selection (manual vs AI)
                category_id = item.get('category_id', '').strip() if item.get('category_id') else None
                category_source = 'manual'
                category_path = None
                ai_confidence = None

                if category_id:
                    # Manual category
                    manual_category_count += 1

                    # Find category path
                    if naver_categories:
                        for cat in naver_categories:
                            if cat.get('id') == category_id:
                                category_path = cat.get('path')
                                break
                else:
                    # AI category analysis
                    if use_ai_category and category_analyzer and naver_categories:
                        try:
                            suggestions = category_analyzer.suggest_categories(
                                product_data={
                                    'title': product_data.get('title', ''),
                                    'price': product_data.get('price', 0),
                                    'desc': product_data.get('description', '')
                                },
                                categories_tree=naver_categories,
                                top_k=3
                            )

                            if suggestions and len(suggestions) > 0:
                                best = suggestions[0]
                                category_id = best['category_id']
                                category_path = best['category_path']
                                ai_confidence = best['confidence']
                                category_source = 'ai'
                                ai_category_count += 1
                                logger.info(f"🤖 AI selected category: {category_path} ({ai_confidence}%)")
                        except Exception as ai_error:
                            logger.warning(f"⚠️ AI category analysis failed: {str(ai_error)}")

                # Step 5: Add user input values
                if item.get('shipping_cost') is not None:
                    product_data['shipping_cost'] = float(item['shipping_cost'])

                if item.get('margin') is not None:
                    product_data['margin'] = float(item['margin'])
                else:
                    product_data['margin'] = 30  # Default margin

                if item.get('weight') is not None:
                    product_data['weight'] = float(item['weight'])

                if item.get('customs_rate') is not None:
                    product_data['customs_rate'] = float(item['customs_rate'])

                if item.get('vat_rate') is not None:
                    product_data['vat_rate'] = float(item['vat_rate'])

                if item.get('memo'):
                    product_data['memo'] = item['memo']

                # Store category info
                if category_id:
                    product_data['category_id'] = category_id

                # Step 6: Save to database
                with get_db() as db:
                    product = Product(
                        id=str(uuid.uuid4()),
                        source='taobao',
                        source_url=taobao_url,
                        supplier_id=product_data.get('seller_id'),
                        title=product_data.get('title', 'Unknown Product'),
                        price=product_data.get('price', 0),
                        currency='CNY',
                        stock=product_data.get('stock', 0),
                        image_url=downloaded_images[0] if downloaded_images else product_data.get('images', [''])[0],
                        data=product_data,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )

                    db.add(product)
                    db.commit()

                    result = {
                        'index': idx,
                        'success': True,
                        'product_id': product.id,
                        'title': product.title,
                        'category_source': category_source,
                        'category_id': category_id,
                        'category_path': category_path
                    }

                    if ai_confidence is not None:
                        result['ai_confidence'] = ai_confidence

                    results.append(result)
                    success_count += 1

                    logger.info(f"✅ Product saved: {product.title}")

            except Exception as e:
                logger.error(f"❌ Failed to import product {idx}: {str(e)}", exc_info=True)
                results.append({
                    'index': idx,
                    'success': False,
                    'error': str(e)
                })
                failed_count += 1

        logger.info(f"📊 Bulk import complete: {success_count} success, {failed_count} failed")

        return jsonify({
            'ok': True,
            'data': {
                'summary': {
                    'total': len(products_data),
                    'success': success_count,
                    'failed': failed_count,
                    'manual_category': manual_category_count,
                    'ai_category': ai_category_count
                },
                'results': results
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Bulk import error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'BULK_IMPORT_ERROR',
                'message': 'Failed to process bulk import',
                'details': {'error': str(e)}
            }
        }), 500
