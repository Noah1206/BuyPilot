"""
Forwarder/shipping routes
Handles shipping to forwarder (approval button 2)
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime

from models import get_db, Order, OrderStatus, AuditLog
from routes.purchase import idempotency_store

bp = Blueprint('forward', __name__)


@bp.route('/orders/<order_id>/actions/send-to-forwarder', methods=['POST'])
def send_to_forwarder(order_id):
    """
    Send order to forwarder (Approval Button 2)
    Headers: Idempotency-Key (required)
    Body: {forwarder_id, options}
    """
    # Check idempotency key
    idem_key = request.headers.get('Idempotency-Key')
    if not idem_key:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'MISSING_IDEMPOTENCY_KEY',
                'message': 'Idempotency-Key header is required',
                'details': {}
            }
        }), 400

    # Check if already processed
    cached = idempotency_store.get(idem_key)
    if cached:
        return jsonify(cached['response']), cached['status_code']

    try:
        with get_db() as db:
            # Get order
            order = db.query(Order).filter(Order.id == order_id).first()

            if not order:
                response = {
                    'ok': False,
                    'error': {
                        'code': 'ORDER_NOT_FOUND',
                        'message': f'Order {order_id} not found',
                        'details': {}
                    }
                }
                idempotency_store.set(idem_key, {'response': response, 'status_code': 404})
                return jsonify(response), 404

            # Validate order status (must have supplier order completed)
            valid_statuses = [OrderStatus.ORDERED_SUPPLIER, OrderStatus.BUYER_INFO_SET]
            if order.status not in valid_statuses:
                response = {
                    'ok': False,
                    'error': {
                        'code': 'INVALID_STATUS',
                        'message': f'Cannot send to forwarder for order in status {order.status.value}',
                        'details': {
                            'current_status': order.status.value,
                            'valid_statuses': [s.value for s in valid_statuses]
                        }
                    }
                }
                idempotency_store.set(idem_key, {'response': response, 'status_code': 400})
                return jsonify(response), 400

            # Get request body
            data = request.get_json(force=True) or {}
            forwarder_id = data.get('forwarder_id', 'kr-fwd-01')
            options = data.get('options', {})

            # Generate job ID
            job_id = f'job-fwd-{str(uuid.uuid4())[:8]}'

            # Update order status
            order.status = OrderStatus.FORWARDER_SENDING
            order.updated_at = datetime.utcnow()
            order.forwarder_id = forwarder_id

            # Update metadata
            if not order.meta:
                order.meta = {}
            order.meta['forwarder_job_id'] = job_id
            order.meta['forwarder_options'] = options

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='user',
                action='send_to_forwarder',
                meta={'job_id': job_id, 'forwarder_id': forwarder_id}
            )

            db.add(audit)
            db.commit()

            # Enqueue background job for forwarder execution
            from workers.scheduler import add_job
            from workers.forwarder_worker import execute_forwarder_job

            add_job(
                func=execute_forwarder_job,
                job_id=job_id,
                order_id=str(order.id),
                forwarder_id=forwarder_id
            )

            response = {
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'job_id': job_id,
                    'forwarder_id': forwarder_id,
                    'next_status': 'FORWARDER_SENDING',
                    'message': 'Forwarder job initiated',
                    'estimated_completion': '1-2 minutes'
                }
            }

            # Cache response
            idempotency_store.set(idem_key, {'response': response, 'status_code': 202})

            return jsonify(response), 202

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Failed to send to forwarder',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/orders/<order_id>/shipping-info', methods=['GET'])
def get_shipping_info(order_id):
    """Get shipping/tracking information for order"""
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

            shipping_info = {
                'order_id': str(order.id),
                'status': order.status.value,
                'forwarder_id': order.forwarder_id,
                'forwarder_job_id': order.forwarder_job_id,
                'tracking_number': order.meta.get('tracking_number') if order.meta else None,
                'buyer': order.buyer_info.to_dict() if order.buyer_info else None,
                'estimated_delivery': None  # TODO: Calculate from forwarder API (Phase 6)
            }

            return jsonify({
                'ok': True,
                'data': shipping_info
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to get shipping info',
                'details': {'error': str(e)}
            }
        }), 500
