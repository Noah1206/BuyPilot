"""
SmartStore API routes
Handles product registration to Naver SmartStore
"""
from flask import Blueprint, request, jsonify
import logging
import os
import requests
from typing import List, Dict
from datetime import datetime
from sqlalchemy import text

from models import get_db, Product, SmartStoreOrder, SmartStoreOrderStatus, TalkTalkStatus
from connectors.naver_commerce_api import get_naver_commerce_api
from connectors.naver_talktalk_api import NaverTalkTalkAPI
from services.image_service import get_image_service

bp = Blueprint('smartstore', __name__)
logger = logging.getLogger(__name__)

# AWS EC2 proxy endpoint (for Naver API IP whitelist)
AWS_EC2_ENDPOINT = os.getenv('AWS_EC2_ENDPOINT', 'http://98.94.199.189:8080')


@bp.route('/smartstore/categories', methods=['GET'])
def get_categories():
    """
    Get Naver SmartStore category list

    Returns: {ok: bool, data: {categories: [...]}}
    """
    try:
        # Initialize Naver Commerce API
        naver_api = get_naver_commerce_api()

        # Get categories
        result = naver_api.get_categories()

        if result.get('success'):
            return jsonify({
                'ok': True,
                'data': {
                    'categories': result.get('categories', [])
                }
            }), 200
        else:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'API_ERROR',
                    'message': 'Failed to fetch categories',
                    'details': {'error': result.get('error')}
                }
            }), 500

    except Exception as e:
        logger.error(f"❌ Error fetching categories: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Internal server error',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/smartstore/register-products', methods=['POST'])
def register_products():
    """
    Register selected products to Naver SmartStore

    Railway (main) forwards Naver API requests to AWS EC2 (Elastic IP for whitelist)

    Body: {
        product_ids: string[],  # List of product IDs to register
        settings: {  # Optional SmartStore settings
            category_id: string,
            stock_quantity: number,
            origin_area: string,
            brand: string,
            manufacturer: string
        }
    }

    Returns: {ok: bool, data: {results: [...], summary: {...}}}
    """
    try:
        # Check if we should proxy to AWS EC2 (for Naver IP whitelist)
        use_aws_proxy = os.getenv('USE_AWS_PROXY', 'false').lower() == 'true'

        if use_aws_proxy:
            proxy_url = f"{AWS_EC2_ENDPOINT}/api/v1/smartstore/register-products"
            logger.info(f"🔄 Proxying Naver API request to AWS EC2: {proxy_url}")
            try:
                # Forward entire request to AWS EC2
                aws_response = requests.post(
                    proxy_url,
                    json=request.get_json(force=True),
                    headers={'Content-Type': 'application/json'},
                    timeout=180  # 3 minutes for product registration
                )

                logger.info(f"✅ AWS EC2 response: status={aws_response.status_code}, body={aws_response.text[:200]}")
                # Return AWS EC2 response
                return jsonify(aws_response.json()), aws_response.status_code

            except requests.exceptions.Timeout:
                logger.error("❌ AWS EC2 request timeout")
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'PROXY_TIMEOUT',
                        'message': 'AWS EC2 request timed out',
                        'details': {}
                    }
                }), 504
            except Exception as e:
                logger.error(f"❌ AWS EC2 proxy error: {str(e)}")
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'PROXY_ERROR',
                        'message': 'Failed to proxy to AWS EC2',
                        'details': {'error': str(e)}
                    }
                }), 502

        # Direct processing (AWS EC2 or local development)
        data = request.get_json(force=True)

        # Validate request
        product_ids = data.get('product_ids', [])
        if not product_ids or len(product_ids) == 0:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'No products selected',
                    'details': {}
                }
            }), 400

        # Get settings from database
        with get_db() as db:
            # Fetch settings from database
            settings_rows = db.execute(text('SELECT key, value FROM settings')).fetchall()
            db_settings = {row[0]: row[1] for row in settings_rows}

        # Get settings (from request body or database)
        settings = data.get('settings', {})
        category_id = settings.get('category_id') or db_settings.get('naver_category_id')  # Required
        stock_quantity = settings.get('stock_quantity', 999)
        origin_area = settings.get('origin_area', '0801')  # China
        brand = settings.get('brand', '')
        manufacturer = settings.get('manufacturer', '')

        # Validate category_id (required)
        if not category_id:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'category_id is required in settings',
                    'details': {
                        'hint': 'Get valid category ID from Naver Seller Center Network tab: attribute-group?leafCategoryId=XXXXX'
                    }
                }
            }), 400

        logger.info(f"📦 Starting SmartStore registration for {len(product_ids)} products")

        # Initialize Naver Commerce API
        naver_api = get_naver_commerce_api()

        # Results tracking
        results = []
        success_count = 0
        failed_count = 0

        # Process each product
        with get_db() as db:
            for product_id in product_ids:
                try:
                    # Get product from database
                    product = db.query(Product).filter(Product.id == product_id).first()

                    if not product:
                        logger.warning(f"⚠️ Product {product_id} not found")
                        results.append({
                            'product_id': product_id,
                            'success': False,
                            'error': 'Product not found'
                        })
                        failed_count += 1
                        continue

                    logger.info(f"🔄 Processing: {product.title[:50]}...")

                    # Step 1: Upload images to Naver
                    logger.info("📷 Step 1/3: Uploading images to Naver...")
                    image_ids = []
                    uploaded_local_images = []  # Track uploaded local images for cleanup

                    # Upload main images
                    main_images = product.data.get('downloaded_images', [])
                    if not main_images:
                        main_images = product.data.get('images', [])

                    for img_url in main_images[:5]:  # Max 5 main images
                        try:
                            image_id = naver_api.upload_image(img_url)
                            if image_id:
                                image_ids.append(image_id)
                                # Track local file path for cleanup (if it's a local file)
                                if img_url.startswith('/') or 'storage/images/' in img_url:
                                    uploaded_local_images.append(img_url)
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to upload image {img_url}: {str(e)}")

                    if len(image_ids) == 0:
                        logger.error(f"❌ No images uploaded for product {product_id}")
                        results.append({
                            'product_id': str(product.id),
                            'product_name': product.title,
                            'success': False,
                            'error': 'Failed to upload images'
                        })
                        failed_count += 1
                        continue

                    # Step 2: Upload description images and build detail HTML
                    logger.info("📝 Step 2/3: Uploading description images and building detail HTML...")

                    # Upload description images to Naver
                    desc_image_urls = []
                    desc_images = product.data.get('downloaded_desc_imgs', [])
                    if not desc_images:
                        desc_images = product.data.get('desc_imgs', [])

                    # Add shipping notice as first image
                    shipping_notice_url = f"{os.getenv('RAILWAY_PUBLIC_DOMAIN', 'https://buypilot-production.up.railway.app')}/shipping-notice.png"
                    desc_images_with_notice = [shipping_notice_url] + list(desc_images[:19])  # shipping notice + 19 others = 20 max

                    for desc_img_url in desc_images_with_notice:
                        try:
                            uploaded_desc_img = naver_api.upload_image(desc_img_url)
                            if uploaded_desc_img:
                                desc_image_urls.append(uploaded_desc_img)
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to upload description image {desc_img_url}: {str(e)}")

                    detail_html = _build_detail_html_from_uploaded_images(desc_image_urls)

                    # Step 3: Prepare product data
                    logger.info("📦 Step 3/3: Registering product...")

                    # Get final selling price
                    final_price = _calculate_final_price(product)

                    product_data = naver_api.build_product_data(
                        name=product.title,
                        price=final_price,
                        stock=stock_quantity,
                        image_ids=image_ids,
                        detail_html=detail_html,
                        category_id=category_id,
                        origin_area=origin_area,
                        brand=brand,
                        manufacturer=manufacturer,
                        options=product.data.get('options', [])
                    )

                    # Register product
                    result = naver_api.register_product(product_data)

                    if result.get('success'):
                        # Update product with SmartStore info
                        if not product.data:
                            product.data = {}

                        product.data['smartstore_product_id'] = result.get('product_id')
                        product.data['smartstore_registered_at'] = datetime.utcnow().isoformat()
                        product.data['smartstore_status'] = 'registered'

                        db.commit()

                        logger.info(f"✅ Product registered: {result.get('product_id')}")

                        # 🗑️ Cleanup: Delete uploaded local images (free tier disk space management)
                        if uploaded_local_images:
                            try:
                                image_service = get_image_service()
                                deleted_count = image_service.delete_images(uploaded_local_images)
                                logger.info(f"🗑️ Cleaned up {deleted_count} local images after successful upload")
                            except Exception as cleanup_error:
                                logger.warning(f"⚠️ Image cleanup failed (non-critical): {str(cleanup_error)}")

                        results.append({
                            'product_id': str(product.id),
                            'product_name': product.title,
                            'success': True,
                            'smartstore_product_id': result.get('product_id'),
                            'smartstore_url': f"https://smartstore.naver.com/product/{result.get('product_id')}"
                        })
                        success_count += 1
                    else:
                        logger.error(f"❌ Registration failed: {result.get('error')}")
                        results.append({
                            'product_id': str(product.id),
                            'product_name': product.title,
                            'success': False,
                            'error': result.get('error', 'Unknown error')
                        })
                        failed_count += 1

                except Exception as e:
                    logger.error(f"❌ Error processing product {product_id}: {str(e)}", exc_info=True)
                    results.append({
                        'product_id': str(product_id),
                        'success': False,
                        'error': str(e)
                    })
                    failed_count += 1

        # Return results
        return jsonify({
            'ok': True,
            'data': {
                'results': results,
                'summary': {
                    'total': len(product_ids),
                    'success': success_count,
                    'failed': failed_count
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ SmartStore registration error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to register products',
                'details': {'error': str(e)}
            }
        }), 500


def _build_detail_html_from_uploaded_images(uploaded_image_urls: List[str]) -> str:
    """
    Build HTML detail content from uploaded Naver image URLs

    Args:
        uploaded_image_urls: List of Naver-uploaded image URLs

    Returns:
        HTML string for product detail page
    """
    html_parts = []

    if uploaded_image_urls and len(uploaded_image_urls) > 0:
        html_parts.append('<div style="width: 100%;">')
        for img_url in uploaded_image_urls:
            html_parts.append(f'<img src="{img_url}" alt="상품 상세" style="max-width: 100%; height: auto; display: block;" />')
        html_parts.append('</div>')
    else:
        # Default content if no description images
        html_parts.append('<div style="padding: 20px; text-align: center;">상품 상세 설명</div>')

    return '\n'.join(html_parts)


def _calculate_final_price(product: Product) -> int:
    """
    Calculate final selling price for product
    Uses frontend calculated price if available (stored in product.data.final_price)

    Args:
        product: Product model instance

    Returns:
        Final price in KRW
    """
    # Priority 1: Use frontend calculated final price (주황색 가격)
    if 'final_price' in product.data and product.data['final_price']:
        final_price = int(product.data['final_price'])
        logger.info(f"Using frontend calculated price: {final_price:,}원")
        return final_price

    # Priority 2: Calculate from stored pricing data
    cost_price = int(product.price * 200) if product.price else 0
    shipping_cost = product.data.get('shipping_cost', 8000)
    margin = product.data.get('margin', 25)

    total_cost = cost_price + shipping_cost
    final_price = int(total_cost * (1 + margin / 100))

    # Round to nearest 10 (Naver requires 10-won units)
    final_price = round(final_price / 10) * 10

    logger.info(f"Calculated price: {final_price:,}원 (cost:{cost_price:,} + ship:{shipping_cost:,} + margin:{margin}%)")
    return final_price


# =============================================================================
# SmartStore Order Management
# =============================================================================

@bp.route('/smartstore/orders', methods=['GET'])
def get_smartstore_orders():
    """
    Get list of SmartStore orders

    Query params:
        status: Filter by order status
        talktalk_status: Filter by TalkTalk status
        limit: Number of results (default 50)
        offset: Offset for pagination (default 0)

    Returns: {ok: bool, data: {orders: [...], total: number}}
    """
    try:
        # Get query parameters
        status = request.args.get('status')
        talktalk_status = request.args.get('talktalk_status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        with get_db() as db:
            # Build query
            query = db.query(SmartStoreOrder)

            # Apply filters
            if status:
                query = query.filter(SmartStoreOrder.order_status == status)
            if talktalk_status:
                query = query.filter(SmartStoreOrder.talktalk_status == talktalk_status)

            # Get total count
            total = query.count()

            # Get paginated results
            orders = query.order_by(SmartStoreOrder.created_at.desc()).offset(offset).limit(limit).all()

            return jsonify({
                'ok': True,
                'data': {
                    'orders': [order.to_dict() for order in orders],
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error fetching SmartStore orders: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to fetch orders',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/smartstore/talktalk-webhook', methods=['POST'])
def talktalk_webhook():
    """
    TalkTalk webhook handler for customer responses

    Body: {
        event: string,
        user: string,  # Customer phone number
        content: {
            text: string  # Customer's message
        },
        ...
    }

    Returns: {ok: bool}
    """
    try:
        data = request.get_json(force=True)

        event = data.get('event')
        user_id = data.get('user')  # Customer phone number
        content = data.get('content', {})
        message_text = content.get('text', '')

        logger.info(f"📩 TalkTalk webhook received: event={event}, user={user_id}")

        # Only process 'send' events (customer responses)
        if event != 'send':
            return jsonify({'ok': True}), 200

        # Initialize TalkTalk API
        talktalk_api = NaverTalkTalkAPI()

        # Parse customs ID from message
        customs_id = talktalk_api.parse_customs_id(message_text)

        if customs_id and talktalk_api.validate_customs_id(customs_id):
            logger.info(f"✅ Valid customs ID received: {customs_id}")

            # Find the order for this customer
            with get_db() as db:
                # Find most recent order waiting for customs ID for this phone number
                order = db.query(SmartStoreOrder).filter(
                    SmartStoreOrder.buyer_phone == user_id,
                    SmartStoreOrder.talktalk_status == TalkTalkStatus.SENT,
                    SmartStoreOrder.customs_id == None
                ).order_by(SmartStoreOrder.created_at.desc()).first()

                if order:
                    # Update order with customs ID
                    order.customs_id = customs_id
                    order.talktalk_status = TalkTalkStatus.RESPONDED
                    order.talktalk_responded_at = datetime.now()
                    order.order_status = SmartStoreOrderStatus.CUSTOMS_ID_RECEIVED

                    db.commit()

                    logger.info(f"✅ Order {order.smartstore_order_id} updated with customs ID")

                    # Send confirmation message to customer
                    confirmation_message = f"""감사합니다! 개인통관고유부호가 확인되었습니다.

📦 주문번호: {order.smartstore_order_id}
🔖 통관번호: {customs_id}

주문을 빠르게 처리하겠습니다. 감사합니다! 😊"""

                    talktalk_api.send_message(
                        user_id=user_id,
                        message=confirmation_message
                    )

                else:
                    logger.warning(f"⚠️ No pending order found for user {user_id}")

        else:
            logger.warning(f"⚠️ Invalid or missing customs ID in message: {message_text}")

        return jsonify({'ok': True}), 200

    except Exception as e:
        logger.error(f"❌ TalkTalk webhook error: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Webhook processing failed',
                'details': {'error': str(e)}
            }
        }), 500
