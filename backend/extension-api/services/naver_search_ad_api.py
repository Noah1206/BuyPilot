"""
Naver Search Ad API Integration
Provides keyword search volume and competition data
"""
import os
import logging
import hashlib
import hmac
import base64
import time
import requests
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class NaverSearchAdAPI:
    """
    Naver Search Ad API Client
    Documentation: https://naver.github.io/searchad-apidoc/
    """

    def __init__(self):
        self.api_key = os.getenv('NAVER_SEARCHAD_API_KEY')
        self.secret_key = os.getenv('NAVER_SEARCHAD_SECRET')
        self.customer_id = os.getenv('NAVER_SEARCHAD_CUSTOMER_ID')
        self.base_url = 'https://api.naver.com'

        if not all([self.api_key, self.secret_key, self.customer_id]):
            logger.warning("⚠️ Naver Search Ad API credentials not configured")

    def _generate_signature(self, timestamp: str, method: str, uri: str) -> str:
        """Generate API signature"""
        message = f"{timestamp}.{method}.{uri}"
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        return base64.b64encode(signature).decode('utf-8')

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make authenticated API request"""
        timestamp = str(int(time.time() * 1000))
        uri = f"/ncc/{endpoint}"
        signature = self._generate_signature(timestamp, method, uri)

        headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': self.api_key,
            'X-Customer': self.customer_id,
            'X-Timestamp': timestamp,
            'X-Signature': signature
        }

        url = f"{self.base_url}{uri}"

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data, timeout=30)
            else:
                response = requests.post(url, headers=headers, json=data, timeout=30)

            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"❌ Naver Search Ad API request failed: {str(e)}")
            raise

    def get_keyword_stats(self, keywords: List[str], device: str = None, month_count: int = 1) -> List[Dict[str, Any]]:
        """
        Get keyword statistics (search volume, competition, etc.)

        Args:
            keywords: List of keywords to analyze
            device: Device type ('pc' or 'mobile', None for both)
            month_count: Number of months to look back (1-12)

        Returns:
            List of keyword statistics
        """
        if not self.api_key:
            raise ValueError("Naver Search Ad API not configured")

        endpoint = "keywords"
        payload = {
            "hintKeywords": keywords,
            "showDetail": "1"
        }

        if device:
            payload["device"] = device
        if month_count:
            payload["monthCount"] = str(month_count)

        try:
            response = self._make_request('POST', endpoint, payload)

            results = []
            for item in response.get('keywordList', []):
                # Extract monthly search volumes
                monthly_pc_searches = int(item.get('monthlyPcQcCnt', 0))
                monthly_mobile_searches = int(item.get('monthlyMobileQcCnt', 0))
                total_monthly = monthly_pc_searches + monthly_mobile_searches

                # Extract competition info
                comp_idx = item.get('compIdx', 'medium')  # low, medium, high

                results.append({
                    'keyword': item.get('relKeyword'),
                    'monthly_search_volume': {
                        'total': total_monthly,
                        'pc': monthly_pc_searches,
                        'mobile': monthly_mobile_searches
                    },
                    'competition': {
                        'index': comp_idx,
                        'level': self._map_competition_level(comp_idx)
                    },
                    'monthly_avg_click': int(item.get('monthlyAvgClkCnt', 0)),
                    'monthly_avg_ctr': float(item.get('monthlyAvgCtr', 0)),
                    'monthly_avg_cpc': int(item.get('monthlyAvgCpc', 0)),
                    'pl_avg_depth': float(item.get('plAvgDepth', 0))
                })

            logger.info(f"✅ Retrieved stats for {len(results)} keywords")
            return results

        except Exception as e:
            logger.error(f"❌ Failed to get keyword stats: {str(e)}")
            raise

    def _map_competition_level(self, comp_idx: str) -> str:
        """Map competition index to level"""
        mapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high'
        }
        return mapping.get(comp_idx, 'medium')

    def get_related_keywords(self, keyword: str, max_results: int = 20) -> List[str]:
        """
        Get related keywords for a given keyword

        Args:
            keyword: Base keyword
            max_results: Maximum number of related keywords

        Returns:
            List of related keywords
        """
        try:
            stats = self.get_keyword_stats([keyword])

            if not stats:
                return []

            # In real implementation, you would call a separate endpoint
            # for related keywords. This is a placeholder.
            logger.info(f"✅ Retrieved {len(stats)} related keywords for '{keyword}'")
            return [stat['keyword'] for stat in stats[:max_results]]

        except Exception as e:
            logger.error(f"❌ Failed to get related keywords: {str(e)}")
            return []


# Singleton instance
_naver_search_ad_api = None

def get_naver_search_ad_api() -> NaverSearchAdAPI:
    """Get or create Naver Search Ad API instance"""
    global _naver_search_ad_api
    if _naver_search_ad_api is None:
        _naver_search_ad_api = NaverSearchAdAPI()
    return _naver_search_ad_api
