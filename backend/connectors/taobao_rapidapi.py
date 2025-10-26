"""
Taobao Product Search using RapidAPI
No SDK required - uses HTTP requests to RapidAPI Taobao endpoint
"""
import os
import requests
import logging
from typing import Dict, Any, List
from connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class TaobaoRapidAPIConnector(BaseConnector):
    """Taobao product search via RapidAPI"""

    def __init__(self):
        """Initialize with RapidAPI credentials"""
        self.api_key = os.getenv('RAPIDAPI_KEY')
        self.base_url = "https://taobao-tmall1.p.rapidapi.com"

        if not self.api_key:
            logger.warning("⚠️ RAPIDAPI_KEY not configured")
        else:
            logger.info("✅ Taobao RapidAPI connector initialized")

    def search_products(
        self,
        keyword: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search products on Taobao via RapidAPI

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with items and total count
        """
        try:
            logger.info(f"🔍 Searching Taobao via RapidAPI: {keyword}")

            if not self.api_key:
                logger.error("⚠️ RapidAPI key not available")
                return {'items': [], 'total': 0, 'error': 'API key missing'}

            # RapidAPI endpoint for Taobao search
            url = f"{self.base_url}/api/item/search"

            headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": "taobao-tmall1.p.rapidapi.com"
            }

            params = {
                "q": keyword,
                "page": page,
                "pageSize": min(page_size, 100)  # RapidAPI may have limits
            }

            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=15
            )

            if response.status_code != 200:
                logger.error(f"❌ RapidAPI returned {response.status_code}: {response.text[:200]}")
                return {'items': [], 'total': 0, 'error': f'API error {response.status_code}'}

            data = response.json()

            # Parse RapidAPI response format
            products = self._parse_rapid_api_response(data)

            logger.info(f"✅ Found {len(products)} products via RapidAPI")

            return {
                'items': products,
                'total': len(products)
            }

        except requests.exceptions.Timeout:
            logger.error("❌ RapidAPI request timeout")
            return {'items': [], 'total': 0, 'error': 'Request timeout'}
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ RapidAPI request failed: {str(e)}")
            return {'items': [], 'total': 0, 'error': str(e)}
        except Exception as e:
            logger.error(f"❌ Error searching products: {str(e)}")
            return {'items': [], 'total': 0, 'error': str(e)}

    def _parse_rapid_api_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse RapidAPI response to standard format"""
        products = []

        try:
            # RapidAPI format varies, try common patterns
            items = data.get('result', {}).get('item', [])
            if not items:
                items = data.get('items', [])
            if not items:
                items = data.get('data', {}).get('items', [])

            for item in items:
                try:
                    product = {
                        'taobao_item_id': str(item.get('num_iid', item.get('item_id', item.get('id', '')))),
                        'title': item.get('title', item.get('raw_title', '')),
                        'price': float(item.get('price', item.get('reserve_price', 0))),
                        'pic_url': item.get('pic_url', item.get('pict_url', '')),
                        'seller_nick': item.get('nick', item.get('seller_nick', '')),
                        'score': 4.5  # Default score if not provided
                    }

                    # Only add if we have minimum required data
                    if product['taobao_item_id'] and product['title']:
                        products.append(product)

                except Exception as e:
                    logger.debug(f"Failed to parse item: {e}")
                    continue

        except Exception as e:
            logger.error(f"❌ Error parsing RapidAPI response: {e}")

        return products


# Singleton instance
_rapidapi_connector = None

def get_taobao_rapidapi() -> TaobaoRapidAPIConnector:
    """Get or create RapidAPI connector singleton"""
    global _rapidapi_connector
    if _rapidapi_connector is None:
        _rapidapi_connector = TaobaoRapidAPIConnector()
    return _rapidapi_connector
