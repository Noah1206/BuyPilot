"""
Structured logging utilities
JSON logging with context (order_id, job_id, etc.)
"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any


class StructuredLogger:
    """Structured JSON logger for better observability"""

    def __init__(self, name: str = 'buypilot'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)

        # Create console handler with JSON formatter
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(self._json_formatter())
            self.logger.addHandler(handler)

    def _json_formatter(self):
        """Create JSON log formatter"""
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_data = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': record.levelname,
                    'message': record.getMessage(),
                    'module': record.module,
                    'function': record.funcName,
                }

                # Add extra fields if present
                if hasattr(record, 'order_id'):
                    log_data['order_id'] = record.order_id
                if hasattr(record, 'job_id'):
                    log_data['job_id'] = record.job_id
                if hasattr(record, 'user_id'):
                    log_data['user_id'] = record.user_id
                if hasattr(record, 'meta'):
                    log_data['meta'] = record.meta

                return json.dumps(log_data)

        return JSONFormatter()

    def info(self, message: str, order_id: Optional[str] = None,
             job_id: Optional[str] = None, meta: Optional[Dict[str, Any]] = None):
        """Log info level message"""
        extra = {}
        if order_id:
            extra['order_id'] = order_id
        if job_id:
            extra['job_id'] = job_id
        if meta:
            extra['meta'] = meta

        self.logger.info(message, extra=extra)

    def error(self, message: str, order_id: Optional[str] = None,
              job_id: Optional[str] = None, meta: Optional[Dict[str, Any]] = None):
        """Log error level message"""
        extra = {}
        if order_id:
            extra['order_id'] = order_id
        if job_id:
            extra['job_id'] = job_id
        if meta:
            extra['meta'] = meta

        self.logger.error(message, extra=extra)

    def warn(self, message: str, order_id: Optional[str] = None,
             job_id: Optional[str] = None, meta: Optional[Dict[str, Any]] = None):
        """Log warning level message"""
        extra = {}
        if order_id:
            extra['order_id'] = order_id
        if job_id:
            extra['job_id'] = job_id
        if meta:
            extra['meta'] = meta

        self.logger.warning(message, extra=extra)


# Global logger instance
logger = StructuredLogger('buypilot')
