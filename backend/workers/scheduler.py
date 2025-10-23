"""
Background job scheduler using APScheduler
Manages purchase and forwarder worker jobs
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Job stores configuration
jobstores = {
    'default': MemoryJobStore()
}

# Executors configuration
executors = {
    'default': ThreadPoolExecutor(max_workers=10)
}

# Job defaults
job_defaults = {
    'coalesce': False,
    'max_instances': 3,
    'misfire_grace_time': 30
}

# Create scheduler instance
scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
    timezone='UTC'
)


def init_scheduler():
    """Initialize and start the scheduler"""
    try:
        scheduler.start()
        logger.info("✅ Background scheduler started successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {str(e)}")
        return False


def shutdown_scheduler():
    """Gracefully shutdown the scheduler"""
    try:
        scheduler.shutdown(wait=True)
        logger.info("✅ Background scheduler shutdown successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to shutdown scheduler: {str(e)}")
        return False


def add_job(func, job_id, run_date=None, **kwargs):
    """
    Add a one-time job to the scheduler

    Args:
        func: Function to execute
        job_id: Unique job identifier
        run_date: When to run the job (datetime object or None for immediate)
        **kwargs: Additional arguments to pass to the function
    """
    try:
        if run_date is None:
            # Run immediately (after 1 second)
            from datetime import timedelta
            run_date = datetime.utcnow() + timedelta(seconds=1)

        scheduler.add_job(
            func=func,
            trigger='date',
            run_date=run_date,
            id=job_id,
            kwargs=kwargs,
            replace_existing=True
        )

        logger.info(f"✅ Job {job_id} scheduled for {run_date}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to add job {job_id}: {str(e)}")
        return False


def remove_job(job_id):
    """Remove a scheduled job"""
    try:
        scheduler.remove_job(job_id)
        logger.info(f"✅ Job {job_id} removed")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Failed to remove job {job_id}: {str(e)}")
        return False


def get_job(job_id):
    """Get job information"""
    try:
        job = scheduler.get_job(job_id)
        return job
    except Exception as e:
        logger.warning(f"⚠️ Failed to get job {job_id}: {str(e)}")
        return None


def get_all_jobs():
    """Get all scheduled jobs"""
    try:
        jobs = scheduler.get_jobs()
        return jobs
    except Exception as e:
        logger.error(f"❌ Failed to get jobs: {str(e)}")
        return []


# Export scheduler functions
__all__ = [
    'scheduler',
    'init_scheduler',
    'shutdown_scheduler',
    'add_job',
    'remove_job',
    'get_job',
    'get_all_jobs'
]
