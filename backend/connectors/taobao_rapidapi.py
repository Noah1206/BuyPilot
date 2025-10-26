"""
Taobao Product Search using RapidAPI
No SDK required - uses HTTP requests to RapidAPI Taobao endpoint
"""
import os
import re
import requests
import logging
import time
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, parse_qs
from connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class TaobaoRapidAPIConnector(BaseConnector):
    """Taobao product search via RapidAPI with caching"""

    def __init__(self):
        """Initialize with RapidAPI credentials and cache"""
        self.api_key = os.getenv('RAPIDAPI_KEY')
        self.base_url = "https://taobao-api.p.rapidapi.com"
        self.api_host = "taobao-api.p.rapidapi.com"

        # Simple in-memory cache (TTL: 1 hour)
        self._cache = {}
        self._cache_ttl = 3600  # 1 hour in seconds

        if not self.api_key:
            logger.warning("⚠️ RAPIDAPI_KEY not configured")
        else:
            logger.info("✅ Taobao RapidAPI connector initialized with caching")

    def _get_cache(self, cache_key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                logger.info(f"✅ Cache HIT for key: {cache_key[:50]}...")
                return cached_data
            else:
                # Expired, remove from cache
                del self._cache[cache_key]
                logger.debug(f"⏰ Cache EXPIRED for key: {cache_key[:50]}...")
        return None

    def _set_cache(self, cache_key: str, value: Any):
        """Set value in cache with current timestamp"""
        self._cache[cache_key] = (value, time.time())
        logger.debug(f"💾 Cache SET for key: {cache_key[:50]}...")

    def search_products(
        self,
        keyword: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search products on Taobao via RapidAPI with scraper fallback and caching

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with items and total count
        """
        try:
            # Check cache first (reduces API calls by ~80%)
            cache_key = f"search:{keyword}:p{page}:s{page_size}"
            cached_result = self._get_cache(cache_key)
            if cached_result is not None:
                return cached_result

            logger.info(f"🔍 Searching Taobao via RapidAPI: {keyword}")

            if not self.api_key:
                logger.warning("⚠️ RapidAPI key not available, using scraper fallback")
                return self._fallback_to_scraper(keyword, page, page_size)

            # RapidAPI endpoint for Taobao search
            url = f"{self.base_url}/api"

            headers = {
                "x-rapidapi-key": self.api_key,
                "x-rapidapi-host": self.api_host
            }

            params = {
                "api": "item_search",
                "q": keyword,
                "page": page,
                "page_size": page_size,
                "sort": "default"
            }

            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=15
            )

            # Check for quota exceeded (429)
            if response.status_code == 429:
                logger.warning(f"⚠️ RapidAPI quota exceeded, falling back to scraper")
                return self._fallback_to_scraper(keyword, page, page_size)

            if response.status_code != 200:
                logger.error(f"❌ RapidAPI returned {response.status_code}: {response.text[:200]}")
                logger.warning(f"⚠️ API error, falling back to scraper")
                return self._fallback_to_scraper(keyword, page, page_size)

            data = response.json()

            # Parse RapidAPI response format
            products = self._parse_rapid_api_response(data)

            logger.info(f"✅ Found {len(products)} products via RapidAPI")

            result = {
                'items': products,
                'total': len(products)
            }

            # Cache successful result
            self._set_cache(cache_key, result)

            return result

        except requests.exceptions.Timeout:
            logger.warning("⚠️ RapidAPI request timeout, falling back to scraper")
            return self._fallback_to_scraper(keyword, page, page_size)
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ RapidAPI request failed: {str(e)}, falling back to scraper")
            return self._fallback_to_scraper(keyword, page, page_size)
        except Exception as e:
            logger.error(f"❌ Error searching products: {str(e)}")
            return self._fallback_to_scraper(keyword, page, page_size)

    def _fallback_to_scraper(self, keyword: str, page: int, page_size: int) -> Dict[str, Any]:
        """
        Fallback to web scraper when RapidAPI is unavailable or quota exceeded

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with items and total count
        """
        try:
            logger.warning(f"🔄 TaobaoScraper doesn't support search - returning empty results")
            # TaobaoScraper only supports scrape_product(url), not search
            # Would need to implement Taobao search page scraping separately
            return {'items': [], 'total': 0, 'error': 'Search not supported by scraper fallback'}

        except Exception as scraper_error:
            logger.error(f"❌ Scraper fallback also failed: {str(scraper_error)}")
            return {'items': [], 'total': 0, 'error': f'Both API and scraper failed: {str(scraper_error)}'}

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
        Get product details by ID via RapidAPI with scraper fallback and caching

        Args:
            product_id: Taobao item ID

        Returns:
            Product information dictionary or None if not found
        """
        try:
            # Check cache first (reduces API calls for duplicate product IDs)
            cache_key = f"product:{product_id}"
            cached_result = self._get_cache(cache_key)
            if cached_result is not None:
                return cached_result

            logger.info(f"🔍 Getting product info for ID: {product_id}")

            if not self.api_key:
                logger.warning("⚠️ RapidAPI key not available, using scraper fallback")
                return self._fallback_get_product_info(product_id)

            # RapidAPI endpoint for product details (matching curl example)
            url = f"{self.base_url}/taobao_detail"

            headers = {
                "x-rapidapi-key": self.api_key,
                "x-rapidapi-host": self.api_host
            }

            params = {
                "num_iid": product_id
            }

            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=15
            )

            # Check for quota exceeded (429)
            if response.status_code == 429:
                logger.warning(f"⚠️ RapidAPI quota exceeded, falling back to scraper")
                return self._fallback_get_product_info(product_id)

            if response.status_code != 200:
                logger.warning(f"⚠️ RapidAPI returned {response.status_code}, falling back to scraper")
                return self._fallback_get_product_info(product_id)

            data = response.json()

            # Parse product data
            item = data.get('result', {}).get('item', {})
            if not item:
                item = data.get('data', {})
            if not item:
                logger.warning(f"⚠️ No product data found for ID: {product_id}, trying scraper")
                return self._fallback_get_product_info(product_id)

            product_info = {
                'taobao_item_id': str(item.get('num_iid', product_id)),
                'title': item.get('title', ''),
                'price': float(item.get('price', 0)),
                'pic_url': item.get('pic_url', ''),
                'seller_nick': item.get('nick', ''),
                'score': 4.5
            }

            logger.info(f"✅ Retrieved product info: {product_info['title'][:50]}...")

            # Cache successful result
            self._set_cache(cache_key, product_info)

            return product_info

        except Exception as e:
            logger.warning(f"⚠️ Error getting product info: {str(e)}, trying scraper")
            return self._fallback_get_product_info(product_id)

    def _fallback_get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Fallback to web scraper for product info when RapidAPI unavailable

        Args:
            product_id: Taobao item ID

        Returns:
            Product information dictionary or None if not found
        """
        try:
            logger.info(f"🔄 Using Taobao scraper as fallback for product ID: {product_id}")
            from connectors.taobao_scraper import TaobaoScraper

            # Construct Taobao URL from product ID
            taobao_url = f"https://item.taobao.com/item.htm?id={product_id}"

            scraper = TaobaoScraper(headless=True)
            product_info = scraper.scrape_product(taobao_url)

            if product_info:
                logger.info(f"✅ Scraper retrieved product: {product_info.get('title', '')[:50]}...")
            else:
                logger.warning(f"⚠️ Scraper could not retrieve product ID: {product_id}")

            return product_info

        except Exception as scraper_error:
            logger.error(f"❌ Scraper fallback also failed: {str(scraper_error)}")
            return None


# Singleton instance
_rapidapi_connector = None

def get_taobao_rapidapi() -> TaobaoRapidAPIConnector:
    """Get or create RapidAPI connector singleton"""
    global _rapidapi_connector
    if _rapidapi_connector is None:
        _rapidapi_connector = TaobaoRapidAPIConnector()
    return _rapidapi_connector
