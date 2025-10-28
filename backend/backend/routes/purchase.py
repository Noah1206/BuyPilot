"""
Purchase execution routes
Handles supplier order execution (approval button 1)
"""
from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime

from models import get_db, Order, OrderStatus, AuditLog
from utils.idempotency import IdempotencyStore

bp = Blueprint('purchase', __name__)

# Idempotency store (will be replaced with Redis in Phase 4)
idempotency_store = IdempotencyStore()


@bp.route('/orders/<order_id>/actions/execute-purchase', methods=['POST'])
def execute_purchase(order_id):
    """
    Execute purchase with supplier (Approval Button 1)
    Headers: Idempotency-Key (required)
    Body: {payment_method, constraints, supplier_override}
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

            # Validate order status
            if order.status not in [OrderStatus.PENDING, OrderStatus.MANUAL_REVIEW]:
                response = {
                    'ok': False,
                    'error': {
                        'code': 'INVALID_STATUS',
                        'message': f'Cannot execute purchase for order in status {order.status.value}',
                        'details': {'current_status': order.status.value}
                    }
                }
                idempotency_store.set(idem_key, {'response': response, 'status_code': 400})
                return jsonify(response), 400

            # Get request body
            data = request.get_json(force=True) or {}
            payment_method = data.get('payment_method', {'type': 'balance'})
            constraints = data.get('constraints', {'max_price_delta_pct': 8})
            supplier_override = data.get('supplier_override')

            # Generate job ID
            job_id = f'job-{str(uuid.uuid4())[:8]}'

            # Update order status
            order.status = OrderStatus.SUPPLIER_ORDERING
            order.updated_at = datetime.utcnow()

            # Update metadata
            if not order.meta:
                order.meta = {}
            order.meta['purchase_job_id'] = job_id
            order.meta['payment_method'] = payment_method
            order.meta['constraints'] = constraints

            if supplier_override:
                order.supplier_id = supplier_override.get('supplier_id')

            # Store idempotency key
            order.idempotency_key = idem_key

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='user',
                action='execute_purchase',
                meta={'job_id': job_id, 'payment_method': payment_method}
            )

            db.add(audit)
            db.commit()

            # Enqueue background job for purchase execution
            from workers.scheduler import add_job
            from workers.purchase_worker import execute_purchase_job

            add_job(
                func=execute_purchase_job,
                job_id=job_id,
                order_id=str(order.id)
            )

            response = {
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'job_id': job_id,
                    'next_status': 'SUPPLIER_ORDERING',
                    'message': 'Purchase execution initiated',
                    'estimated_completion': '30-60 seconds'
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
                'message': 'Failed to execute purchase',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/orders/<order_id>/actions/cancel-purchase', methods=['POST'])
def cancel_purchase(order_id):
    """Cancel pending purchase order"""
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

            if order.status != OrderStatus.SUPPLIER_ORDERING:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'INVALID_STATUS',
                        'message': f'Cannot cancel order in status {order.status.value}',
                        'details': {}
                    }
                }), 400

            # Update status
            order.status = OrderStatus.MANUAL_REVIEW
            order.updated_at = datetime.utcnow()

            # Update metadata
            if not order.meta:
                order.meta = {}

            data = request.get_json(force=True) or {}
            order.meta['cancellation_reason'] = data.get('reason', 'User cancelled')

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='user',
                action='cancel_purchase',
                meta={'reason': order.meta['cancellation_reason']}
            )

            db.add(audit)
            db.commit()

            return jsonify({
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'status': 'MANUAL_REVIEW',
                    'message': 'Purchase cancelled'
                }
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to cancel purchase',
                'details': {'error': str(e)}
            }
        }), 500
