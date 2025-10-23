"""
Forwarder worker - Background job for shipping to forwarder
Handles forwarder automation with retry logic
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


def execute_forwarder_job(order_id: str, job_id: str, forwarder_id: str, retry_count: int = 0):
    """
    Background job to send order to forwarder

    Args:
        order_id: Order UUID
        job_id: Job identifier
        forwarder_id: Forwarder service ID
        retry_count: Current retry attempt (0-based)
    """
    logger.info(f"🔄 [Job {job_id}] Starting forwarder job for order {order_id} (attempt {retry_count + 1}/{MAX_RETRIES})")

    try:
        with get_db() as db:
            # Get order
            order = db.query(Order).filter(Order.id == order_id).first()

            if not order:
                logger.error(f"❌ [Job {job_id}] Order {order_id} not found")
                return

            # Check if order is still in correct status
            if order.status != OrderStatus.FORWARDER_SENDING:
                logger.warning(f"⚠️ [Job {job_id}] Order {order_id} is no longer in FORWARDER_SENDING status (current: {order.status.value})")
                return

            # Simulate forwarder API call
            success, tracking_number = _call_forwarder_api(order, job_id, forwarder_id, retry_count)

            if success:
                # Update order to success
                order.status = OrderStatus.SENT_TO_FORWARDER
                order.forwarder_job_id = f'FWD-{str(uuid.uuid4())[:8].upper()}'
                order.updated_at = datetime.utcnow()

                if not order.meta:
                    order.meta = {}
                order.meta['forwarder_completed_at'] = datetime.utcnow().isoformat()
                order.meta['tracking_number'] = tracking_number
                order.meta['forwarder_job_attempts'] = retry_count + 1

                # Create audit log
                audit = AuditLog(
                    order_id=order.id,
                    actor='system',
                    action='forwarder_completed',
                    meta={
                        'job_id': job_id,
                        'forwarder_job_id': order.forwarder_job_id,
                        'tracking_number': tracking_number,
                        'attempts': retry_count + 1
                    }
                )
                db.add(audit)
                db.commit()

                logger.info(f"✅ [Job {job_id}] Forwarder job completed successfully for order {order_id} (tracking: {tracking_number})")

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
                        action='forwarder_retry_scheduled',
                        meta={
                            'job_id': job_id,
                            'retry_count': retry_count + 1,
                            'next_retry_in': f'{RETRY_DELAY_SECONDS}s'
                        }
                    )
                    db.add(audit)
                    db.commit()

                    logger.warning(f"⚠️ [Job {job_id}] Forwarder job failed for order {order_id}, scheduling retry {retry_count + 2}/{MAX_RETRIES} in {RETRY_DELAY_SECONDS}s")

                    # Schedule retry
                    from workers.scheduler import add_job
                    from datetime import timedelta
                    retry_time = datetime.utcnow() + timedelta(seconds=RETRY_DELAY_SECONDS)
                    add_job(
                        func=execute_forwarder_job,
                        job_id=f"{job_id}-retry-{retry_count + 1}",
                        run_date=retry_time,
                        order_id=order_id,
                        job_id=job_id,
                        forwarder_id=forwarder_id,
                        retry_count=retry_count + 1
                    )

                else:
                    # Max retries reached, move to manual review
                    order.status = OrderStatus.MANUAL_REVIEW
                    order.updated_at = datetime.utcnow()

                    if not order.meta:
                        order.meta = {}
                    order.meta['failure_reason'] = 'Max retries reached for forwarder job'
                    order.meta['failed_at'] = datetime.utcnow().isoformat()
                    order.meta['total_attempts'] = retry_count + 1

                    # Create audit log
                    audit = AuditLog(
                        order_id=order.id,
                        actor='system',
                        action='forwarder_failed',
                        meta={
                            'job_id': job_id,
                            'reason': 'Max retries reached',
                            'total_attempts': retry_count + 1
                        }
                    )
                    db.add(audit)
                    db.commit()

                    logger.error(f"❌ [Job {job_id}] Forwarder job failed for order {order_id} after {retry_count + 1} attempts, moved to MANUAL_REVIEW")

    except Exception as e:
        logger.error(f"❌ [Job {job_id}] Exception in forwarder job for order {order_id}: {str(e)}")
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


def _call_forwarder_api(order: Order, job_id: str, forwarder_id: str, retry_count: int) -> tuple:
    """
    Simulate forwarder API call
    TODO: Replace with actual forwarder API integration in Phase 6

    Args:
        order: Order object
        job_id: Job identifier
        forwarder_id: Forwarder service ID
        retry_count: Current retry attempt

    Returns:
        tuple: (success: bool, tracking_number: str or None)
    """
    try:
        # Simulate API call delay
        time.sleep(1.5)

        # Simulate 95% success rate (5% failure for testing retry logic)
        import random
        success_rate = 0.95 if retry_count == 0 else 0.98  # Higher success on retries

        if random.random() < success_rate:
            # Generate tracking number
            tracking_number = f'TRK{str(uuid.uuid4())[:12].upper()}'
            logger.info(f"✅ [Job {job_id}] Forwarder API call successful (simulated) - tracking: {tracking_number}")
            return True, tracking_number
        else:
            logger.warning(f"⚠️ [Job {job_id}] Forwarder API call failed (simulated)")
            return False, None

    except Exception as e:
        logger.error(f"❌ [Job {job_id}] Forwarder API call exception: {str(e)}")
        return False, None
