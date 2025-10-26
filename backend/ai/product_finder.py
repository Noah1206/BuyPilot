"""
Product Finder - Search and filter products from Taobao
"""
import os
import logging
from typing import List, Dict, Any, Optional
from connectors.taobao_api import get_taobao_connector

logger = logging.getLogger(__name__)


class ProductFinder:
    """Find and filter products from Taobao based on keywords"""

    def __init__(self):
        """Initialize with Taobao connector"""
        try:
            self.taobao = get_taobao_connector()
            logger.info("✅ ProductFinder initialized with Taobao connector")
        except Exception as e:
            logger.warning(f"⚠️ Taobao connector not available: {e}")
            self.taobao = None

    def search_products(
        self,
        keyword: str,
        min_price: float = 10,
        max_price: float = 500,
        min_rating: float = 4.5,
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search products on Taobao by keyword with filters

        Args:
            keyword: Search keyword
            min_price: Minimum price in CNY
            max_price: Maximum price in CNY
            min_rating: Minimum seller rating (0-5)
            max_results: Maximum number of results

        Returns:
            List of product dictionaries
        """
        logger.info(f"🔍 Searching Taobao for: {keyword}")

        if not self.taobao:
            logger.warning("⚠️ Taobao connector not available, returning mock data")
            return self._get_mock_products(keyword, max_results)

        try:
            # Search products using Taobao API
            # Note: This requires taobao.items.search permission
            search_result = self.taobao.search_products(
                keyword=keyword,
                page_size=max_results * 2  # Get extra to filter
            )

            # Extract products from search result
            if isinstance(search_result, dict):
                products = search_result.get('items', [])
            else:
                products = search_result if search_result else []

            if not products:
                logger.warning(f"No products found for keyword: {keyword}")
                return []

            # Filter products
            filtered = self._filter_products(
                products,
                min_price=min_price,
                max_price=max_price,
                min_rating=min_rating
            )

            # Limit results
            result = filtered[:max_results]

            logger.info(f"✅ Found {len(result)} products for keyword: {keyword}")
            return result

        except Exception as e:
            logger.error(f"❌ Error searching products: {str(e)}")
            return self._get_mock_products(keyword, max_results)

    def _filter_products(
        self,
        products: List[Dict[str, Any]],
        min_price: float,
        max_price: float,
        min_rating: float
    ) -> List[Dict[str, Any]]:
        """Filter products by criteria"""
        filtered = []

        for product in products:
            price = float(product.get('price', 0))
            rating = float(product.get('score', 0))

            # Apply filters
            if price < min_price or price > max_price:
                continue

            if rating < min_rating:
                continue

            # Check if has images
            if not product.get('pic_url') and not product.get('images'):
                continue

            filtered.append(product)

        return filtered

    def get_product_details(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed product information

        Args:
            product_id: Taobao product ID

        Returns:
            Product detail dictionary or None
        """
        logger.info(f"📦 Getting product details for ID: {product_id}")

        if not self.taobao:
            logger.warning("⚠️ Taobao connector not available")
            return None

        try:
            product = self.taobao.get_product_info(product_id)
            return product

        except Exception as e:
            logger.error(f"❌ Error getting product details: {str(e)}")
            return None

    def _get_mock_products(self, keyword: str, count: int) -> List[Dict[str, Any]]:
        """Get mock products for testing"""
        logger.info(f"🎭 Generating {count} mock products for: {keyword}")

        mock_products = []

        for i in range(count):
            mock_products.append({
                'taobao_item_id': f'66009472675{i}',
                'title': f'{keyword} 상품 {i+1} - 2024 신상 고품질',
                'price': round(50 + (i * 10) + (i * 2.5), 2),
                'currency': 'CNY',
                'pic_url': f'https://img.alicdn.com/imgextra/i{i%4+1}/mock_{i}.jpg',
                'images': [
                    f'https://img.alicdn.com/imgextra/i{j%4+1}/mock_{i}_{j}.jpg'
                    for j in range(5)
                ],
                'seller_nick': f'优质店铺{i+1}',
                'num': 1000 + (i * 100),
                'score': round(4.5 + (i * 0.05), 1),
                'location': '浙江 杭州',
                'desc': f'{keyword} 관련 상품입니다. 고품질 보장!',
                'cid': '50010850',
                'mock': True
            })

        return mock_products

    def batch_get_products(self, product_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Get multiple products at once

        Args:
            product_ids: List of Taobao product IDs

        Returns:
            List of product dictionaries
        """
        logger.info(f"📦 Getting {len(product_ids)} products in batch")

        products = []
        for product_id in product_ids:
            product = self.get_product_details(product_id)
            if product:
                products.append(product)

        logger.info(f"✅ Retrieved {len(products)}/{len(product_ids)} products")
        return products


# Singleton instance
_product_finder = None

def get_product_finder() -> ProductFinder:
    """Get singleton ProductFinder instance"""
    global _product_finder
    if _product_finder is None:
        _product_finder = ProductFinder()
    return _product_finder
