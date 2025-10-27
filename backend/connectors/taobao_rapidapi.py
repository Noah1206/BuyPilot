"""
Taobao Product API using RapidAPI
Fetches product details from Taobao using RapidAPI's Taobao API service
Supports dual endpoints: Item Details + Item SKU Info for complete product data
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
    """Taobao product API via RapidAPI with caching and scraper fallback"""

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
            logger.info("✅ Taobao RapidAPI connector initialized")

    def _get_cache(self, cache_key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                logger.info(f"✅ Cache HIT: {cache_key[:50]}")
                return cached_data
            else:
                del self._cache[cache_key]
                logger.debug(f"⏰ Cache EXPIRED: {cache_key[:50]}")
        return None

    def _set_cache(self, cache_key: str, value: Any):
        """Set value in cache with current timestamp"""
        self._cache[cache_key] = (value, time.time())
        logger.debug(f"💾 Cache SET: {cache_key[:50]}")

    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from Taobao/Tmall/1688 URL

        Supported formats:
        - https://item.taobao.com/item.htm?id=681298346857
        - https://detail.tmall.com/item.htm?id=681298346857
        - https://m.taobao.com/awp/core/detail.htm?id=681298346857
        - https://detail.1688.com/offer/681298346857.html

        Args:
            url: Product URL

        Returns:
            Product ID (num_iid) or None if invalid
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
        Get complete product information by ID via RapidAPI

        Calls TWO endpoints for complete data:
        1. /taobao_detail - Basic info (title, images, properties)
        2. /taobao_detail - SKU info (price, options, stock)

        Args:
            product_id: Taobao item ID (num_iid)

        Returns:
            Complete product information dictionary or None if failed
        """
        try:
            # Check cache first
            cache_key = f"product:{product_id}"
            cached_result = self._get_cache(cache_key)
            if cached_result is not None:
                return cached_result

            logger.info(f"🔍 Fetching product info for ID: {product_id}")

            if not self.api_key:
                logger.warning("⚠️ RapidAPI key not available, using scraper fallback")
                return self._fallback_get_product_info(product_id)

            # Step 1: Get basic product details
            logger.info("📥 Step 1/2: Fetching Item Details...")
            details = self._get_item_details(product_id)

            if not details:
                logger.warning("⚠️ Item Details failed, falling back to scraper")
                return self._fallback_get_product_info(product_id)

            # Step 2: Get SKU information (price, options)
            logger.info("📥 Step 2/2: Fetching SKU Info...")
            sku_info = self._get_item_sku_info(product_id)

            # Merge both responses
            product_info = self._merge_product_data(details, sku_info, product_id)

            logger.info(f"✅ Complete product info retrieved: {product_info.get('title', '')[:50]}")

            # Cache successful result
            self._set_cache(cache_key, product_info)

            return product_info

        except Exception as e:
            logger.error(f"❌ Error getting product info: {str(e)}", exc_info=True)
            logger.warning("⚠️ Falling back to scraper...")
            return self._fallback_get_product_info(product_id)

    def _get_item_details(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get basic product details from RapidAPI Item Details endpoint

        Returns:
            Dictionary with title, images, properties or None if failed
        """
        try:
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

            if response.status_code == 429:
                logger.warning("⚠️ RapidAPI quota exceeded")
                return None

            if response.status_code != 200:
                logger.warning(f"⚠️ Item Details returned {response.status_code}")
                logger.debug(f"Response: {response.text[:200]}")
                return None

            data = response.json()

            # Check for error response
            result = data.get('result', {})
            status = result.get('status', {})

            if status.get('msg') == 'error':
                logger.warning(f"⚠️ API error: {status.get('sub_code', 'unknown')}")
                return None

            # Parse item details
            item = result.get('item', {})
            if not item:
                logger.warning("⚠️ No item data in response")
                return None

            # Fix image URLs (add https:)
            images = item.get('images', [])
            fixed_images = []
            for img_url in images:
                if img_url.startswith('//'):
                    fixed_images.append(f"https:{img_url}")
                elif not img_url.startswith('http'):
                    fixed_images.append(f"https://{img_url}")
                else:
                    fixed_images.append(img_url)

            details = {
                'num_iid': item.get('num_iid', product_id),
                'title': item.get('title', ''),
                'images': fixed_images,
                'detail_url': f"https:{item.get('detail_url', '')}" if item.get('detail_url') else '',
                'properties': item.get('properties', []),
                'properties_cut': item.get('properties_cut', ''),
            }

            logger.info(f"✅ Item Details: {details['title'][:50]}")
            return details

        except requests.exceptions.Timeout:
            logger.warning("⚠️ Item Details request timeout")
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching Item Details: {str(e)}")
            return None

    def _get_item_sku_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get SKU information from RapidAPI (same endpoint, different response)

        Returns:
            Dictionary with price, options, stock or None if failed
        """
        try:
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

            if response.status_code != 200:
                logger.warning(f"⚠️ SKU Info returned {response.status_code}")
                return None

            data = response.json()

            result = data.get('result', {})
            item = result.get('item', {})
            skus = item.get('skus', {})

            if not skus:
                logger.warning("⚠️ No SKU data in response")
                return None

            # Parse price (format: "8.85 - 14.85" or "8.85")
            price_str = skus.get('price', '0')
            if isinstance(price_str, str) and ' - ' in price_str:
                price = float(price_str.split(' - ')[0])
            else:
                try:
                    price = float(price_str)
                except:
                    price = 0.0

            # Parse promotion price
            promotion_price_str = skus.get('promotion_price', '0')
            if isinstance(promotion_price_str, str) and ' - ' in promotion_price_str:
                promotion_price = float(promotion_price_str.split(' - ')[0])
            else:
                try:
                    promotion_price = float(promotion_price_str) if promotion_price_str else 0.0
                except:
                    promotion_price = 0.0

            # Parse options from sku_props
            options = []
            sku_props = skus.get('sku_props', [])

            for prop in sku_props:
                option = {
                    'pid': prop.get('pid', ''),
                    'name': prop.get('name', ''),
                    'values': []
                }

                for value in prop.get('values', []):
                    img_url = value.get('image', '')
                    if img_url and img_url.startswith('//'):
                        img_url = f"https:{img_url}"

                    option['values'].append({
                        'vid': value.get('vid', ''),
                        'name': value.get('name', ''),
                        'image': img_url
                    })

                if option['values']:
                    options.append(option)

            sku_info = {
                'price': price,
                'promotion_price': promotion_price if promotion_price > 0 else price,
                'quantity': int(skus.get('quantity', 0)),
                'options': options,
                'sku_base': skus.get('sku_base', []),
            }

            logger.info(f"✅ SKU Info: price=¥{price}, options={len(options)}")
            return sku_info

        except Exception as e:
            logger.error(f"❌ Error fetching SKU Info: {str(e)}")
            return None

    def _merge_product_data(
        self,
        details: Optional[Dict[str, Any]],
        sku_info: Optional[Dict[str, Any]],
        product_id: str
    ) -> Dict[str, Any]:
        """
        Merge Item Details and SKU Info into complete product data

        Args:
            details: Item Details response
            sku_info: SKU Info response
            product_id: Product ID (fallback)

        Returns:
            Complete product information dictionary
        """
        # Base product info
        product = {
            'taobao_item_id': product_id,
            'title': '',
            'price': 0.0,
            'pic_url': '',
            'images': [],
            'seller_nick': '',
            'num': 0,
            'score': 4.5,
        }

        # Merge details
        if details:
            product['taobao_item_id'] = details.get('num_iid', product_id)
            product['title'] = details.get('title', '')
            product['images'] = details.get('images', [])
            product['pic_url'] = details['images'][0] if details.get('images') else ''
            product['properties'] = details.get('properties', [])
            product['detail_url'] = details.get('detail_url', '')

        # Merge SKU info
        if sku_info:
            product['price'] = sku_info.get('promotion_price', sku_info.get('price', 0.0))
            product['num'] = sku_info.get('quantity', 0)
            product['options'] = sku_info.get('options', [])
            product['sku_base'] = sku_info.get('sku_base', [])

        return product

    def _fallback_get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Fallback to web scraper when RapidAPI unavailable

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
                logger.info(f"✅ Scraper retrieved product: {product_info.get('title', '')[:50]}")
            else:
                logger.warning(f"⚠️ Scraper could not retrieve product ID: {product_id}")

            return product_info

        except Exception as scraper_error:
            logger.error(f"❌ Scraper fallback also failed: {str(scraper_error)}")
            return None

    def search_products(
        self,
        keyword: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search products on Taobao (not implemented for this API)

        For now, falls back to scraper for search functionality.

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with items and total count
        """
        logger.info(f"🔍 Search not implemented in RapidAPI, using scraper")
        return self._fallback_search(keyword, page, page_size)

    def _fallback_search(self, keyword: str, page: int, page_size: int) -> Dict[str, Any]:
        """
        Fallback to web scraper for search

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with items and total count
        """
        try:
            logger.info(f"🔄 Using Taobao scraper for search: {keyword}")
            from connectors.taobao_scraper import get_taobao_scraper

            scraper = get_taobao_scraper()
            products = scraper.search_products(keyword, page, page_size)

            if products:
                logger.info(f"✅ Scraper found {len(products)} products")
            else:
                logger.warning(f"⚠️ Scraper found no products")

            return {
                'items': products,
                'total': len(products)
            }

        except Exception as scraper_error:
            logger.error(f"❌ Scraper search also failed: {str(scraper_error)}")
            return {'items': [], 'total': 0}


# Singleton instance
_rapidapi_connector = None

def get_taobao_rapidapi() -> TaobaoRapidAPIConnector:
    """Get or create RapidAPI connector singleton"""
    global _rapidapi_connector
    if _rapidapi_connector is None:
        _rapidapi_connector = TaobaoRapidAPIConnector()
    return _rapidapi_connector
