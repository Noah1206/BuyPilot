"""
SmartStore API routes
Handles product registration to Naver SmartStore
"""
from flask import Blueprint, request, jsonify
import logging
from typing import List, Dict
from datetime import datetime

from models import get_db, Product, SmartStoreOrder, SmartStoreOrderStatus, TalkTalkStatus
from connectors.naver_commerce_api import get_naver_commerce_api
from connectors.naver_talktalk_api import NaverTalkTalkAPI

bp = Blueprint('smartstore', __name__)
logger = logging.getLogger(__name__)


@bp.route('/smartstore/register-products', methods=['POST'])
def register_products():
    """
    Register selected products to Naver SmartStore

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

        # Get settings
        settings = data.get('settings', {})
        category_id = settings.get('category_id', '50000006')  # Default: 선반
        stock_quantity = settings.get('stock_quantity', 999)
        origin_area = settings.get('origin_area', '0801')  # China
        brand = settings.get('brand', '')
        manufacturer = settings.get('manufacturer', '')

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

                    # Upload main images
                    main_images = product.data.get('downloaded_images', [])
                    if not main_images:
                        main_images = product.data.get('images', [])

                    for img_url in main_images[:5]:  # Max 5 main images
                        try:
                            # Ensure URL has proper scheme
                            if not img_url.startswith(('http://', 'https://')):
                                img_url = f'https://{img_url}'

                            image_id = naver_api.upload_image(img_url)
                            if image_id:
                                image_ids.append(image_id)
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

                    # Step 2: Build detail HTML with description images + shipping notice
                    logger.info("📝 Step 2/3: Building product detail HTML...")
                    detail_html = _build_detail_html(product)

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


def _build_detail_html(product: Product) -> str:
    """
    Build HTML detail content with description images and shipping notice

    Args:
        product: Product model instance

    Returns:
        HTML string for product detail page
    """
    html_parts = []

    # Add shipping notice image first
    html_parts.append('<div style="width: 100%; text-align: center;">')
    html_parts.append('<img src="/shipping-notice.png" alt="배송 안내" style="max-width: 100%; height: auto;" />')
    html_parts.append('</div>')

    # Add description images
    desc_images = product.data.get('downloaded_desc_imgs', [])
    if not desc_images:
        desc_images = product.data.get('desc_imgs', [])

    if desc_images:
        html_parts.append('<div style="width: 100%;">')
        for img_url in desc_images:
            html_parts.append(f'<img src="{img_url}" alt="상품 상세" style="max-width: 100%; height: auto; display: block;" />')
        html_parts.append('</div>')

    return '\n'.join(html_parts)


def _calculate_final_price(product: Product) -> int:
    """
    Calculate final selling price for product

    Args:
        product: Product model instance

    Returns:
        Final price in KRW
    """
    # Get cost price (CNY to KRW, rate: 200)
    cost_price = int(product.price * 200) if product.price else 0

    # Get shipping cost
    shipping_cost = product.data.get('shipping_cost', 0)
    if not shipping_cost:
        # Calculate from weight or use default
        weight = product.data.get('weight', 0)
        if weight and weight > 0:
            # Get shipping rates from localStorage (would need to pass from frontend)
            # For now, use default
            shipping_cost = 8000
        else:
            shipping_cost = 8000  # Default shipping cost

    # Get margin (default 25%)
    margin = product.data.get('margin', 25)

    # Calculate final price
    total_cost = cost_price + shipping_cost
    final_price = int(total_cost * (1 + margin / 100))

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
