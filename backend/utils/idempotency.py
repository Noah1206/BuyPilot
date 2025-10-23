"""
Idempotency utilities
Ensures duplicate requests with same key don't cause duplicate operations
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta


class IdempotencyStore:
    """
    Simple in-memory idempotency store
    In production, use Redis or database with TTL
    """

    def __init__(self, ttl_seconds: int = 86400):
        self.store: Dict[str, Dict[str, Any]] = {}
        self.ttl_seconds = ttl_seconds

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached response for idempotency key"""
        if key not in self.store:
            return None

        entry = self.store[key]

        # Check if expired
        if datetime.utcnow() > entry['expires_at']:
            del self.store[key]
            return None

        return {
            'response': entry['response'],
            'status_code': entry['status_code']
        }

    def set(self, key: str, response: Dict[str, Any], status_code: int):
        """Cache response for idempotency key"""
        self.store[key] = {
            'response': response,
            'status_code': status_code,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(seconds=self.ttl_seconds)
        }

    def exists(self, key: str) -> bool:
        """Check if key exists and is not expired"""
        return self.get(key) is not None

    def cleanup_expired(self):
        """Remove expired entries (call periodically)"""
        now = datetime.utcnow()
        expired_keys = [
            k for k, v in self.store.items()
            if now > v['expires_at']
        ]
        for key in expired_keys:
            del self.store[key]


# Global idempotency store instance
idempotency_store = IdempotencyStore(ttl_seconds=86400)  # 24 hours


def validate_idempotency_key(key: Optional[str]) -> tuple[bool, Optional[str]]:
    """
    Validate idempotency key format
    Returns (is_valid, error_message)
    """
    if not key:
        return False, "Idempotency-Key header is required"

    if len(key) < 8:
        return False, "Idempotency-Key must be at least 8 characters"

    if len(key) > 255:
        return False, "Idempotency-Key must not exceed 255 characters"

    return True, None
