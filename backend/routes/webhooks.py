"""
Webhook routes for external systems
Handles callbacks from supplier and forwarder APIs
"""
from flask import Blueprint, request, jsonify
import hmac
import hashlib
from datetime import datetime

from models import get_db, Order, OrderStatus, AuditLog

bp = Blueprint('webhooks', __name__)


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature for webhook"""
    expected = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@bp.route('/webhooks/supplier', methods=['POST'])
def supplier_webhook():
    """
    Webhook from supplier (order status updates)
    Expected headers: X-Signature, X-Timestamp
    Body: {event, supplier_order_id, status, data}
    """
    # Get signature (for production, verify this)
    signature = request.headers.get('X-Signature', '')
    # TODO: Verify signature in production (Phase 3)
    # if not verify_webhook_signature(request.data, signature, SUPPLIER_SECRET):
    #     return jsonify({'ok': False, 'error': 'Invalid signature'}), 401

    try:
        data = request.get_json(force=True)

        event = data.get('event')
        supplier_order_id = data.get('supplier_order_id')
        status = data.get('status')

        with get_db() as db:
            # Find order by supplier_order_id
            order = db.query(Order).filter(
                Order.supplier_order_id == supplier_order_id
            ).first()

            if not order:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'ORDER_NOT_FOUND',
                        'message': f'Order with supplier_order_id {supplier_order_id} not found',
                        'details': {}
                    }
                }), 404

            # Update order based on event
            if event == 'order.confirmed':
                order.status = OrderStatus.ORDERED_SUPPLIER
                if not order.meta:
                    order.meta = {}
                order.meta['supplier_confirmed_at'] = datetime.utcnow().isoformat()

            elif event == 'order.shipped':
                order.status = OrderStatus.BUYER_INFO_SET
                if not order.meta:
                    order.meta = {}
                order.meta['supplier_shipped_at'] = datetime.utcnow().isoformat()
                order.meta['supplier_tracking'] = data.get('tracking_number')

            elif event == 'order.cancelled':
                order.status = OrderStatus.FAILED
                if not order.meta:
                    order.meta = {}
                order.meta['supplier_cancelled_at'] = datetime.utcnow().isoformat()
                order.meta['cancellation_reason'] = data.get('reason', 'Supplier cancelled')

            elif event == 'order.out_of_stock':
                order.status = OrderStatus.MANUAL_REVIEW
                if not order.meta:
                    order.meta = {}
                order.meta['stock_issue'] = data.get('details', {})

            order.updated_at = datetime.utcnow()

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='webhook',
                action=f'supplier_{event}',
                meta={'event': event, 'data': data}
            )

            db.add(audit)
            db.commit()

            return jsonify({
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'event': event,
                    'processed': True
                }
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'WEBHOOK_ERROR',
                'message': 'Failed to process webhook',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/webhooks/forwarder', methods=['POST'])
def forwarder_webhook():
    """
    Webhook from forwarder (shipping status updates)
    Expected headers: X-Signature, X-Timestamp
    Body: {event, forwarder_job_id, status, data}
    """
    # Get signature (for production, verify this)
    signature = request.headers.get('X-Signature', '')
    # TODO: Verify signature in production (Phase 3)

    try:
        data = request.get_json(force=True)

        event = data.get('event')
        forwarder_job_id = data.get('forwarder_job_id')
        status = data.get('status')

        with get_db() as db:
            # Find order by forwarder_job_id
            order = db.query(Order).filter(
                Order.forwarder_job_id == forwarder_job_id
            ).first()

            if not order:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'ORDER_NOT_FOUND',
                        'message': f'Order with forwarder_job_id {forwarder_job_id} not found',
                        'details': {}
                    }
                }), 404

            # Update order based on event
            if event == 'job.received':
                order.status = OrderStatus.SENT_TO_FORWARDER
                if not order.meta:
                    order.meta = {}
                order.meta['forwarder_received_at'] = datetime.utcnow().isoformat()

            elif event == 'job.in_transit':
                if not order.meta:
                    order.meta = {}
                order.meta['forwarder_shipped_at'] = datetime.utcnow().isoformat()
                order.meta['tracking_number'] = data.get('tracking_number')

            elif event == 'job.delivered':
                order.status = OrderStatus.DONE
                if not order.meta:
                    order.meta = {}
                order.meta['delivered_at'] = datetime.utcnow().isoformat()

            elif event == 'job.failed':
                order.status = OrderStatus.FAILED
                if not order.meta:
                    order.meta = {}
                order.meta['forwarder_failed_at'] = datetime.utcnow().isoformat()
                order.meta['failure_reason'] = data.get('reason', 'Forwarder failed')

            order.updated_at = datetime.utcnow()

            # Create audit log
            audit = AuditLog(
                order_id=order.id,
                actor='webhook',
                action=f'forwarder_{event}',
                meta={'event': event, 'data': data}
            )

            db.add(audit)
            db.commit()

            return jsonify({
                'ok': True,
                'data': {
                    'order_id': str(order.id),
                    'event': event,
                    'processed': True
                }
            }), 200

    except Exception as e:
        return jsonify({
            'ok': False,
            'error': {
                'code': 'WEBHOOK_ERROR',
                'message': 'Failed to process webhook',
                'details': {'error': str(e)}
            }
        }), 500
