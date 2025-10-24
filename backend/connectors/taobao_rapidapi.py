"""
Taobao RapidAPI Connector
Uses RapidAPI Taobao API service instead of web scraping
More reliable and no bot detection issues
"""
import os
import logging
from typing import Dict, Any, Optional, List
import requests
from urllib.parse import urlparse, parse_qs
import re

logger = logging.getLogger(__name__)


class TaobaoRapidAPI:
    """Taobao API connector using RapidAPI service"""

    def __init__(self):
        """Initialize RapidAPI connector"""
        self.api_key = os.getenv('RAPIDAPI_KEY')
        if not self.api_key:
            logger.warning("⚠️ RAPIDAPI_KEY not configured. RapidAPI will not work.")

        self.base_url = "https://taobao-api.p.rapidapi.com"
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": "taobao-api.p.rapidapi.com"
        }

        logger.info("✅ TaobaoRapidAPI initialized")

    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from Taobao/Tmall URL

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

    def get_product_detail(self, item_id: str) -> Optional[Dict[str, Any]]:
        """
        Get product details from RapidAPI using item_search

        Since item_get is not available, we search by item ID

        Args:
            item_id: Taobao product ID

        Returns:
            Product information dictionary or None if failed
        """
        if not self.api_key:
            logger.error("❌ RAPIDAPI_KEY not configured")
            return None

        try:
            logger.info(f"🔄 Fetching product {item_id} from RapidAPI...")

            # Taobao API - taobao_detail endpoint
            url = f"{self.base_url}/taobao_detail"
            params = {
                "num_iid": item_id
            }

            response = requests.get(url, headers=self.headers, params=params, timeout=30)

            # Log response status
            logger.info(f"📡 RapidAPI response status: {response.status_code}")

            response.raise_for_status()

            data = response.json()

            # Log full response for debugging
            logger.info(f"📦 Full API response: {data}")

            # Check result structure
            result = data.get('result', {})

            # Check for errors
            status = result.get('status', {})
            logger.info(f"📊 Status: {status}")

            if status.get('msg') != 'success':
                error_msg = status.get('msg', 'Unknown error')
                logger.error(f"❌ RapidAPI error: {error_msg}")
                logger.error(f"❌ Full status: {status}")
                return None

            # Get item data
            item = result.get('item', {})

            if not item:
                logger.error(f"❌ No product data found for ID: {item_id}")
                return None

            # Parse SKU pricing
            skus = item.get('skus', {})
            price_range = skus.get('price', '0')
            # Get first price from range (e.g., "8.85 - 14.85" → "8.85")
            price = self._parse_price(price_range.split('-')[0].strip() if '-' in str(price_range) else price_range)

            # Parse images
            images_raw = item.get('images', [])
            images = [f"https:{img}" if img.startswith('//') else img for img in images_raw]

            # Parse description images
            desc_imgs = item.get('desc_imgs', [])
            desc_images = [f"https:{img}" if img.startswith('//') else img for img in desc_imgs]

            # Combine all images
            all_images = images + desc_images

            # Get seller info
            seller = item.get('seller', {})

            product_info = {
                'source': 'taobao',
                'taobao_item_id': item_id,
                'title': item.get('title', ''),
                'price': price,
                'num': int(skus.get('quantity', 0)),
                'pic_url': images[0] if images else '',
                'images': all_images[:10],  # Limit to 10 images
                'seller_nick': seller.get('shop_title', ''),
                'location': '',  # Not provided in this API
                'cid': '',  # Not provided in this API
                'props': item.get('properties_cut', ''),
                'modified': item.get('updated', ''),
                'desc': '',  # Description is in desc_imgs
                'detail_url': item.get('detail_url', ''),
                'skus': skus,  # Include SKU data
            }

            logger.info(f"✅ Successfully fetched product: {product_info['title'][:50]}...")
            return product_info

        except requests.exceptions.Timeout:
            logger.error(f"❌ RapidAPI request timeout for item {item_id}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ RapidAPI request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Error fetching product from RapidAPI: {str(e)}")
            return None

    def _parse_price(self, price_value) -> float:
        """Parse price from various formats"""
        if not price_value:
            return 0.0

        try:
            if isinstance(price_value, (int, float)):
                return float(price_value)

            # Remove currency symbols and commas
            price_str = str(price_value).replace(',', '').replace('¥', '').strip()
            return float(price_str)
        except (ValueError, TypeError):
            logger.warning(f"⚠️ Could not parse price: {price_value}")
            return 0.0

    def _extract_images(self, item: dict) -> List[str]:
        """Extract image URLs from item data"""
        images = []

        # Main image
        pic_url = item.get('pic_url', '')
        if pic_url:
            if pic_url.startswith('//'):
                pic_url = 'https:' + pic_url
            images.append(pic_url)

        # Additional images
        item_imgs = item.get('item_imgs', [])
        if isinstance(item_imgs, list):
            for img in item_imgs:
                if isinstance(img, dict):
                    url = img.get('url', '')
                elif isinstance(img, str):
                    url = img
                else:
                    continue

                if url:
                    if url.startswith('//'):
                        url = 'https:' + url
                    if url not in images:
                        images.append(url)

        return images[:10]  # Limit to 10 images


# Singleton instance
_rapidapi_connector = None

def get_taobao_rapidapi() -> TaobaoRapidAPI:
    """Get singleton TaobaoRapidAPI instance"""
    global _rapidapi_connector
    if _rapidapi_connector is None:
        _rapidapi_connector = TaobaoRapidAPI()
    return _rapidapi_connector
