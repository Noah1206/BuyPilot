"""
Taobao Product Search using RapidAPI
No SDK required - uses HTTP requests to RapidAPI Taobao endpoint
"""
import os
import re
import requests
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, parse_qs
from connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class TaobaoRapidAPIConnector(BaseConnector):
    """Taobao product search via RapidAPI"""

    def __init__(self):
        """Initialize with RapidAPI credentials"""
        self.api_key = os.getenv('RAPIDAPI_KEY')
        self.base_url = "https://taobao-tmall-all-api1.p.rapidapi.com"
        self.api_host = "taobao-tmall-all-api1.p.rapidapi.com"

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
            url = f"{self.base_url}/api/taobao/search-item"

            headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": self.api_host
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

    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from Taobao/1688 URL
        (Copied from taobao_scraper.py for code reuse)

        Supported formats:
        - https://item.taobao.com/item.htm?id=123456789
        - https://detail.tmall.com/item.htm?id=123456789
        - https://m.taobao.com/awp/core/detail.htm?id=123456789
        - https://detail.1688.com/offer/123456789.html

        Args:
            url: Product URL

        Returns:
            Product ID or None if invalid
        """
        try:
            parsed = urlparse(url)

            # Check domain
            valid_domains = ['taobao.com', 'tmall.com', '1688.com']
            if not any(domain in parsed.netloc for domain in valid_domains):
                logger.warning(f"⚠️ Invalid domain: {parsed.netloc}")
                return None

            # Extract ID from query string (Taobao/Tmall)
            query_params = parse_qs(parsed.query)
            if 'id' in query_params:
                product_id = query_params['id'][0]
                logger.info(f"✅ Extracted product ID: {product_id}")
                return product_id

            # Extract ID from path (1688)
            match = re.search(r'/offer/(\d+)\.html', url)
            if match:
                product_id = match.group(1)
                logger.info(f"✅ Extracted 1688 product ID: {product_id}")
                return product_id

            # Try to extract from path (mobile URLs)
            match = re.search(r'/(\d{10,})\.htm', url)
            if match:
                product_id = match.group(1)
                logger.info(f"✅ Extracted product ID from path: {product_id}")
                return product_id

            logger.warning(f"⚠️ Could not extract product ID from URL: {url}")
            return None

        except Exception as e:
            logger.error(f"❌ Error parsing URL: {str(e)}")
            return None

    def get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get product details by ID via RapidAPI

        Args:
            product_id: Taobao item ID

        Returns:
            Product information dictionary or None if not found
        """
        try:
            logger.info(f"🔍 Getting product info for ID: {product_id}")

            if not self.api_key:
                logger.error("⚠️ RapidAPI key not available")
                return None

            # RapidAPI endpoint for product details (matching curl example)
            url = f"{self.base_url}/api/taobao/get-item-detail/v5"

            headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": self.api_host
            }

            params = {
                "itemId": product_id
            }

            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=15
            )

            if response.status_code != 200:
                logger.error(f"❌ RapidAPI returned {response.status_code}")
                return None

            data = response.json()

            # Parse product data
            item = data.get('result', {}).get('item', {})
            if not item:
                item = data.get('data', {})
            if not item:
                logger.warning(f"⚠️ No product data found for ID: {product_id}")
                return None

            product_info = {
                'taobao_item_id': str(item.get('num_iid', product_id)),
                'title': item.get('title', ''),
                'price': float(item.get('price', 0)),
                'pic_url': item.get('pic_url', ''),
                'seller_nick': item.get('nick', ''),
                'score': 4.5
            }

            logger.info(f"✅ Retrieved product info: {product_info['title'][:50]}...")
            return product_info

        except Exception as e:
            logger.error(f"❌ Error getting product info: {str(e)}")
            return None


# Singleton instance
_rapidapi_connector = None

def get_taobao_rapidapi() -> TaobaoRapidAPIConnector:
    """Get or create RapidAPI connector singleton"""
    global _rapidapi_connector
    if _rapidapi_connector is None:
        _rapidapi_connector = TaobaoRapidAPIConnector()
    return _rapidapi_connector
