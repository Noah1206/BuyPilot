"""
Purchase worker - Background job for supplier order execution
Handles purchase automation with retry logic
"""
import logging
import uuid
import time
from datetime import datetime

from models import get_db, Order, OrderStatus, AuditLog

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 30


def execute_purchase_job(order_id: str, job_id: str, retry_count: int = 0):
    """
    Background job to execute purchase with supplier

    Args:
        order_id: Order UUID
        job_id: Job identifier
        retry_count: Current retry attempt (0-based)
    """
    logger.info(f"🔄 [Job {job_id}] Starting purchase execution for order {order_id} (attempt {retry_count + 1}/{MAX_RETRIES})")

    try:
        with get_db() as db:
            # Get order
            order = db.query(Order).filter(Order.id == order_id).first()

            if not order:
                logger.error(f"❌ [Job {job_id}] Order {order_id} not found")
                return

            # Check if order is still in correct status
            if order.status != OrderStatus.SUPPLIER_ORDERING:
                logger.warning(f"⚠️ [Job {job_id}] Order {order_id} is no longer in SUPPLIER_ORDERING status (current: {order.status.value})")
                return

            # Simulate supplier API call
            success = _call_supplier_api(order, job_id, retry_count)

            if success:
                # Update order to success
                order.status = OrderStatus.ORDERED_SUPPLIER
                order.supplier_order_id = f'SUP-{str(uuid.uuid4())[:8].upper()}'
                order.updated_at = datetime.utcnow()

                if not order.meta:
                    order.meta = {}
                order.meta['purchase_completed_at'] = datetime.utcnow().isoformat()
                order.meta['purchase_job_attempts'] = retry_count + 1

                # Create audit log
                audit = AuditLog(
                    order_id=order.id,
                    actor='system',
                    action='purchase_completed',
                    meta={
                        'job_id': job_id,
                        'supplier_order_id': order.supplier_order_id,
                        'attempts': retry_count + 1
                    }
                )
                db.add(audit)
                db.commit()

                logger.info(f"✅ [Job {job_id}] Purchase completed successfully for order {order_id} (supplier order: {order.supplier_order_id})")

            else:
                # Handle failure
                if retry_count < MAX_RETRIES - 1:
                    # Retry
                    order.status = OrderStatus.RETRYING
                    order.updated_at = datetime.utcnow()

                    if not order.meta:
                        order.meta = {}
                    order.meta['last_retry_at'] = datetime.utcnow().isoformat()
                    order.meta['retry_count'] = retry_count + 1

                    # Create audit log
                    audit = AuditLog(
                        order_id=order.id,
                        actor='system',
                        action='purchase_retry_scheduled',
                        meta={
                            'job_id': job_id,
                            'retry_count': retry_count + 1,
                            'next_retry_in': f'{RETRY_DELAY_SECONDS}s'
                        }
                    )
                    db.add(audit)
                    db.commit()

                    logger.warning(f"⚠️ [Job {job_id}] Purchase failed for order {order_id}, scheduling retry {retry_count + 2}/{MAX_RETRIES} in {RETRY_DELAY_SECONDS}s")

                    # Schedule retry
                    from workers.scheduler import add_job
                    from datetime import timedelta
                    retry_time = datetime.utcnow() + timedelta(seconds=RETRY_DELAY_SECONDS)
                    add_job(
                        func=execute_purchase_job,
                        job_id=f"{job_id}-retry-{retry_count + 1}",
                        run_date=retry_time,
                        order_id=order_id,
                        retry_count=retry_count + 1
                    )

                else:
                    # Max retries reached, move to manual review
                    order.status = OrderStatus.MANUAL_REVIEW
                    order.updated_at = datetime.utcnow()

                    if not order.meta:
                        order.meta = {}
                    order.meta['failure_reason'] = 'Max retries reached for purchase execution'
                    order.meta['failed_at'] = datetime.utcnow().isoformat()
                    order.meta['total_attempts'] = retry_count + 1

                    # Create audit log
                    audit = AuditLog(
                        order_id=order.id,
                        actor='system',
                        action='purchase_failed',
                        meta={
                            'job_id': job_id,
                            'reason': 'Max retries reached',
                            'total_attempts': retry_count + 1
                        }
                    )
                    db.add(audit)
                    db.commit()

                    logger.error(f"❌ [Job {job_id}] Purchase failed for order {order_id} after {retry_count + 1} attempts, moved to MANUAL_REVIEW")

    except Exception as e:
        logger.error(f"❌ [Job {job_id}] Exception in purchase job for order {order_id}: {str(e)}")
        # Try to update order status
        try:
            with get_db() as db:
                order = db.query(Order).filter(Order.id == order_id).first()
                if order:
                    order.status = OrderStatus.FAILED
                    order.updated_at = datetime.utcnow()
                    if not order.meta:
                        order.meta = {}
                    order.meta['failure_reason'] = f'Exception: {str(e)}'
                    db.commit()
        except:
            pass


def _call_supplier_api(order: Order, job_id: str, retry_count: int) -> bool:
    """
    Simulate supplier API call
    TODO: Replace with actual supplier API integration in Phase 6

    Args:
        order: Order object
        job_id: Job identifier
        retry_count: Current retry attempt

    Returns:
        bool: True if successful, False if failed
    """
    try:
        # Simulate API call delay
        time.sleep(2)

        # Simulate 90% success rate (10% failure for testing retry logic)
        import random
        success_rate = 0.9 if retry_count == 0 else 0.95  # Higher success on retries

        if random.random() < success_rate:
            logger.info(f"✅ [Job {job_id}] Supplier API call successful (simulated)")
            return True
        else:
            logger.warning(f"⚠️ [Job {job_id}] Supplier API call failed (simulated)")
            return False

    except Exception as e:
        logger.error(f"❌ [Job {job_id}] Supplier API call exception: {str(e)}")
        return False
