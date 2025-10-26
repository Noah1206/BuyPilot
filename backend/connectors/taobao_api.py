"""
Taobao Open Platform API Connector
Uses TOP (Taobao Open Platform) SDK for product information retrieval
"""
import os
import re
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs

# Optional import - taobao SDK may not be available
try:
    import top.api
    from top import TOP
    HAS_TAOBAO_SDK = True
except ImportError:
    HAS_TAOBAO_SDK = False
    logging.warning("Taobao SDK not installed. Install 'top-api' package for full functionality.")

from connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class TaobaoAPIConnector(BaseConnector):
    """Taobao Open Platform API connector"""

    def __init__(self):
        """Initialize Taobao API connector"""
        self.app_key = os.getenv('TAOBAO_APP_KEY')
        self.app_secret = os.getenv('TAOBAO_APP_SECRET')
        self.session_key = os.getenv('TAOBAO_SESSION_KEY', '')  # Optional for some APIs

        if not HAS_TAOBAO_SDK:
            logger.warning("⚠️ Taobao SDK not available. Using mock data mode.")
            self.client = None
            return

        if not self.app_key or not self.app_secret:
            logger.warning("⚠️ Taobao API credentials not configured. Using mock data mode.")
            self.client = None
            return

        # Initialize TOP client
        self.client = TOP(self.app_key, self.app_secret, 'gw.api.taobao.com')

        logger.info("✅ Taobao API connector initialized")

    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from Taobao URL

        Supported URL formats:
        - https://item.taobao.com/item.htm?id=123456789
        - https://detail.tmall.com/item.htm?id=123456789
        - https://m.taobao.com/awp/core/detail.htm?id=123456789

        Args:
            url: Taobao product URL

        Returns:
            Product ID (num_iid) or None if invalid
        """
        try:
            # Parse URL
            parsed = urlparse(url)

            # Check if it's a Taobao/Tmall domain
            valid_domains = ['taobao.com', 'tmall.com', 'm.taobao.com', 'detail.tmall.com', 'item.taobao.com']
            if not any(domain in parsed.netloc for domain in valid_domains):
                logger.warning(f"⚠️ Invalid domain: {parsed.netloc}")
                return None

            # Extract 'id' parameter from query string
            query_params = parse_qs(parsed.query)
            if 'id' in query_params:
                product_id = query_params['id'][0]
                logger.info(f"✅ Extracted product ID: {product_id} from URL")
                return product_id

            # Try to extract from path (some mobile URLs)
            match = re.search(r'/(\d{10,})\.htm', url)
            if match:
                product_id = match.group(1)
                logger.info(f"✅ Extracted product ID from path: {product_id}")
                return product_id

            logger.warning(f"⚠️ Could not extract product ID from URL: {url}")
            return None

        except Exception as e:
            logger.error(f"❌ Error parsing Taobao URL: {str(e)}")
            return None

    def get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed product information from Taobao

        Uses taobao.item.get API

        Args:
            product_id: Taobao product ID (num_iid)

        Returns:
            Dictionary with product information or None if error
        """
        try:
            logger.info(f"🔄 Fetching product info for ID: {product_id}")

            # Create API request
            req = top.api.ItemGetRequest()
            req.set_app_info(self.app_key, self.app_secret)

            # Set product ID
            req.num_iid = product_id

            # Set fields to retrieve (all available fields)
            fields = [
                'num_iid',          # Product ID
                'title',            # Product title
                'nick',             # Seller nickname
                'pic_url',          # Main image URL
                'price',            # Price
                'type',             # Product type
                'cid',              # Category ID
                'seller_cids',      # Seller category
                'props',            # Product properties
                'input_pids',       # Custom input properties
                'input_str',        # Custom input values
                'desc',             # Description
                'num',              # Stock quantity
                'valid_thru',       # Valid through date
                'list_time',        # List time
                'delist_time',      # Delist time
                'stuff_status',     # Product status
                'location',         # Location
                'express_fee',      # Express fee
                'ems_fee',          # EMS fee
                'post_fee',         # Post fee
                'has_discount',     # Has discount
                'has_invoice',      # Has invoice
                'has_warranty',     # Has warranty
                'has_showcase',     # In showcase
                'modified',         # Last modified
                'approve_status',   # Approval status
                'postage_id',       # Postage template ID
                'product_id',       # SPU ID
                'auction_point',    # Score
                'property_alias',   # Property alias
                'item_img',         # Item images
                'prop_img',         # Property images
                'sku',              # SKU information
                'video',            # Video information
                'skus',             # All SKUs
            ]
            req.fields = ','.join(fields)

            # Execute API call
            try:
                response = self.client.execute(req)

                # Check for errors
                if hasattr(response, 'error_response'):
                    error = response.error_response
                    logger.error(f"❌ Taobao API error: {error.get('msg', 'Unknown error')}")
                    return None

                # Parse response
                if hasattr(response, 'item'):
                    item = response.item

                    # Convert to dictionary
                    product_data = {
                        'taobao_item_id': str(item.num_iid) if hasattr(item, 'num_iid') else product_id,
                        'title': item.title if hasattr(item, 'title') else '',
                        'price': float(item.price) if hasattr(item, 'price') else 0.0,
                        'pic_url': item.pic_url if hasattr(item, 'pic_url') else '',
                        'seller_nick': item.nick if hasattr(item, 'nick') else '',
                        'num': int(item.num) if hasattr(item, 'num') else 0,
                        'desc': item.desc if hasattr(item, 'desc') else '',
                        'location': getattr(item, 'location', {}).get('state', '') if hasattr(item, 'location') else '',
                        'score': float(item.auction_point) if hasattr(item, 'auction_point') else 0.0,

                        # Images
                        'images': [],
                        'main_image': item.pic_url if hasattr(item, 'pic_url') else '',

                        # Additional info
                        'cid': str(item.cid) if hasattr(item, 'cid') else '',
                        'props': item.props if hasattr(item, 'props') else '',
                        'modified': str(item.modified) if hasattr(item, 'modified') else '',
                    }

                    # Extract multiple images
                    if hasattr(item, 'item_imgs') and item.item_imgs:
                        if hasattr(item.item_imgs, 'item_img'):
                            images = item.item_imgs.item_img
                            if isinstance(images, list):
                                product_data['images'] = [img.url for img in images if hasattr(img, 'url')]
                            else:
                                product_data['images'] = [images.url] if hasattr(images, 'url') else []

                    # If no images in item_imgs, use pic_url
                    if not product_data['images'] and product_data['pic_url']:
                        product_data['images'] = [product_data['pic_url']]

                    logger.info(f"✅ Successfully fetched product: {product_data['title'][:50]}...")
                    return product_data

                else:
                    logger.error(f"❌ No item found in response for product ID: {product_id}")
                    return None

            except Exception as api_error:
                logger.error(f"❌ Taobao API call failed: {str(api_error)}")
                return None

        except Exception as e:
            logger.error(f"❌ Error fetching product info: {str(e)}")
            return None

    def search_products(self, keyword: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        Search products by keyword

        Uses taobao.items.search API (requires special permission)

        Args:
            keyword: Search keyword
            page: Page number (1-based)
            page_size: Items per page (max 200)

        Returns:
            Dictionary with search results
        """
        try:
            logger.info(f"🔍 Searching for: {keyword} (page {page})")

            # Check if SDK and client are available
            if not HAS_TAOBAO_SDK or not self.client:
                logger.error("⚠️ Taobao SDK not available - SDK must be installed")
                return {'items': [], 'total': 0, 'error': 'SDK not available'}

            # Create API request
            req = top.api.ItemsSearchRequest()
            req.set_app_info(self.app_key, self.app_secret)

            # Set search parameters
            req.q = keyword
            req.page_no = page
            req.page_size = min(page_size, 200)  # Max 200 per page

            # Execute API call
            try:
                response = self.client.execute(req)

                # Check for errors
                if hasattr(response, 'error_response'):
                    error = response.error_response
                    logger.error(f"❌ Taobao search error: {error.get('msg', 'Unknown error')}")
                    return {'items': [], 'total': 0}

                # Parse response
                if hasattr(response, 'items') and hasattr(response.items, 'item'):
                    items = response.items.item
                    total_results = response.total_results if hasattr(response, 'total_results') else 0

                    # Convert items to list of dictionaries
                    product_list = []
                    for item in items:
                        product_list.append({
                            'taobao_item_id': str(item.num_iid) if hasattr(item, 'num_iid') else '',
                            'title': item.title if hasattr(item, 'title') else '',
                            'price': float(item.price) if hasattr(item, 'price') else 0.0,
                            'pic_url': item.pic_url if hasattr(item, 'pic_url') else '',
                            'seller_nick': item.nick if hasattr(item, 'nick') else '',
                        })

                    logger.info(f"✅ Found {len(product_list)} products (total: {total_results})")
                    return {
                        'items': product_list,
                        'total': total_results,
                        'page': page,
                        'page_size': page_size
                    }

                else:
                    logger.info(f"ℹ️ No search results for: {keyword}")
                    return {'items': [], 'total': 0}

            except Exception as api_error:
                logger.error(f"❌ Taobao search API failed: {str(api_error)}")
                # Search API requires special permission, return empty results
                return {'items': [], 'total': 0, 'error': 'Search API requires special permission'}

        except Exception as e:
            logger.error(f"❌ Error searching products: {str(e)}")
            return {'items': [], 'total': 0, 'error': str(e)}


# Singleton instance
_taobao_connector = None

def get_taobao_connector():
    """
    Get Taobao connector - uses RapidAPI (no SDK required)

    Returns connector compatible with TaobaoAPIConnector interface
    """
    global _taobao_connector
    if _taobao_connector is None:
        # Use RapidAPI instead of official SDK (SDK has Python 2 dependency issues)
        from connectors.taobao_rapidapi import get_taobao_rapidapi
        _taobao_connector = get_taobao_rapidapi()
        logger.info("✅ Using Taobao RapidAPI (SDK-free)")
    return _taobao_connector
