"""
Orders API routes
Handles order creation, retrieval, and management
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from sqlalchemy import desc

from models import get_db, Order, OrderStatus, BuyerInfo, AuditLog

bp = Blueprint('orders', __name__)


@bp.route('/orders', methods=['GET'])
def get_orders():
    """
    Get list of orders with optional filtering
    Query params: status, platform, limit, offset
    """
    status_filter = request.args.get('status')
    platform_filter = request.args.get('platform')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))

    try:
        with get_db() as db:
            # Build query
            query = db.query(Order)

            # Apply filters
            if status_filter:
                query = query.filter(Order.status == status_filter)

            if platform_filter:
                query = query.filter(Order.platform == platform_filter)

            # Get total count
            total = query.count()

            # Sort by created_at desc and paginate
            orders = query.order_by(desc(Order.created_at))\
                         .limit(limit)\
                         .offset(offset)\
                         .all()

            # Convert to dict
            orders_data = [order.to_dict() for order in orders]

            return jsonify({
                'ok': True,
                'data': {
                    'orders': orders_data,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch orders',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    """Get single order by ID"""
    try:
        with get_db() as db:
            order = db.query(Order).filter(Order.id == order_id).first()

            if not order:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'ORDER_NOT_FOUND',
                        'message': f'Order {order_id} not found',
                        'details': {}
                    }
                }), 404

            return jsonify({
                'ok': True,
                'data': order.to_dict()
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch order',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/events/order-created', methods=['POST'])
def create_order():
    """
    Create new order (webhook from platform or manual)
    Body: {platform, platform_order_ref, items, buyer, meta}
    """
    try:
        data = request.get_json(force=True)

        # Validate required fields
        required = ['platform', 'platform_order_ref', 'items', 'buyer']
        for field in required:
            if field not in data:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': f'Missing required field: {field}',
                        'details': {}
                    }
                }), 400

        with get_db() as db:
            # Get first item (simplified for demo)
            items = data['items']
            first_item = items[0] if items else {}

            # Create order
            order = Order(
                status=OrderStatus.PENDING,
                platform=data['platform'],
                platform_order_ref=data['platform_order_ref'],
                qty=first_item.get('qty', 1),
                unit_price=first_item.get('price'),
                currency='USD',
                meta={
                    'items': items,
                    'product_url': first_item.get('product_source_url'),
                    **data.get('meta', {})
                }
            )

            db.add(order)
            db.flush()  # Get order.id

            # Create buyer info
            buyer = data['buyer']
            buyer_info = BuyerInfo(
                order_id=order.id,
                name=buyer.get('name'),
                phone=buyer.get('phone'),
                address1=buyer.get('address1'),
                address2=buyer.get('address2'),
                zip=buyer.get('zip'),
                country=buyer.get('country', 'KR'),
                customs_id=buyer.get('customs_id')
            )

            db.add(buyer_info)

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='system',
                action='order_created',
                meta={'platform': data['platform']}
            )

            db.add(audit)
            db.commit()

            return jsonify({
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'status': 'PENDING',
                    'message': 'Order created successfully'
                }
            }), 201

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to create order',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/orders/<order_id>/retry', methods=['POST'])
def retry_order(order_id):
    """Retry failed order"""
    try:
        with get_db() as db:
            order = db.query(Order).filter(Order.id == order_id).first()

            if not order:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'ORDER_NOT_FOUND',
                        'message': f'Order {order_id} not found',
                        'details': {}
                    }
                }), 404

            if order.status not in [OrderStatus.FAILED, OrderStatus.MANUAL_REVIEW]:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'INVALID_STATUS',
                        'message': f'Cannot retry order in status {order.status.value}',
                        'details': {}
                    }
                }), 400

            # Reset to PENDING
            order.status = OrderStatus.PENDING
            order.updated_at = datetime.utcnow()

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='user',
                action='order_retry',
                meta={'previous_status': order.status.value}
            )

            db.add(audit)
            db.commit()

            return jsonify({
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'status': 'PENDING',
                    'message': 'Order retry initiated'
                }
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to retry order',
                'details': {'error': str(e)}
            }
        }), 500
