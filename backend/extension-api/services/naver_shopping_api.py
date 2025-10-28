"""
Naver Shopping API Integration
Provides product search and price distribution data
"""
import os
import logging
import requests
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class NaverShoppingAPI:
    """
    Naver Shopping Search API Client
    Documentation: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
    """

    def __init__(self):
        self.client_id = os.getenv('NAVER_CLIENT_ID')
        self.client_secret = os.getenv('NAVER_CLIENT_SECRET')
        self.base_url = 'https://openapi.naver.com/v1/search'

        if not all([self.client_id, self.client_secret]):
            logger.warning("⚠️ Naver Shopping API credentials not configured")

    def search_products(
        self,
        query: str,
        display: int = 100,
        start: int = 1,
        sort: str = 'sim'
    ) -> Dict[str, Any]:
        """
        Search for products on Naver Shopping

        Args:
            query: Search keyword
            display: Number of results (1-100)
            start: Start index (1-1000)
            sort: Sort type ('sim', 'date', 'asc', 'dsc')

        Returns:
            Search results with products
        """
        if not self.client_id:
            raise ValueError("Naver Shopping API not configured")

        url = f"{self.base_url}/shop.json"
        headers = {
            'X-Naver-Client-Id': self.client_id,
            'X-Naver-Client-Secret': self.client_secret
        }
        params = {
            'query': query,
            'display': min(display, 100),
            'start': start,
            'sort': sort
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            logger.info(f"✅ Retrieved {len(data.get('items', []))} products for '{query}'")
            return data

        except requests.RequestException as e:
            logger.error(f"❌ Naver Shopping API request failed: {str(e)}")
            raise

    def get_price_distribution(self, query: str, max_products: int = 100) -> Dict[str, Any]:
        """
        Get price distribution for products matching query

        Args:
            query: Search keyword
            max_products: Maximum number of products to analyze

        Returns:
            Price distribution data with ranges and counts
        """
        try:
            results = self.search_products(query, display=max_products)
            items = results.get('items', [])

            if not items:
                return {
                    'ranges': [],
                    'counts': [],
                    'total_products': 0,
                    'min_price': 0,
                    'max_price': 0,
                    'avg_price': 0
                }

            # Extract prices
            prices = []
            for item in items:
                try:
                    # Remove currency formatting and convert to int
                    price_str = item.get('lprice', '0').replace(',', '')
                    price = int(price_str)
                    if price > 0:
                        prices.append(price)
                except (ValueError, AttributeError):
                    continue

            if not prices:
                return {
                    'ranges': [],
                    'counts': [],
                    'total_products': 0,
                    'min_price': 0,
                    'max_price': 0,
                    'avg_price': 0
                }

            # Calculate statistics
            min_price = min(prices)
            max_price = max(prices)
            avg_price = sum(prices) / len(prices)

            # Create price ranges
            ranges, counts = self._create_price_ranges(prices, min_price, max_price)

            return {
                'ranges': ranges,
                'counts': counts,
                'total_products': len(prices),
                'min_price': min_price,
                'max_price': max_price,
                'avg_price': int(avg_price)
            }

        except Exception as e:
            logger.error(f"❌ Failed to get price distribution: {str(e)}")
            raise

    def _create_price_ranges(
        self,
        prices: List[int],
        min_price: int,
        max_price: int,
        num_ranges: int = 10
    ) -> tuple[List[str], List[int]]:
        """Create price distribution ranges"""
        # Calculate range size
        range_size = (max_price - min_price) / num_ranges

        # Initialize ranges
        ranges = []
        counts = [0] * num_ranges

        # Create range labels and count products
        for i in range(num_ranges):
            range_start = int(min_price + (i * range_size))
            range_end = int(min_price + ((i + 1) * range_size))

            # Format range label
            if i == num_ranges - 1:
                label = f"{range_start // 10000}만+"
            else:
                label = f"{range_start // 10000}-{range_end // 10000}만"

            ranges.append(label)

            # Count products in this range
            for price in prices:
                if range_start <= price < range_end or (i == num_ranges - 1 and price >= range_start):
                    counts[i] += 1

        return ranges, counts

    def get_product_count(self, query: str) -> int:
        """
        Get total count of products for a keyword

        Args:
            query: Search keyword

        Returns:
            Total product count
        """
        try:
            results = self.search_products(query, display=1)
            return results.get('total', 0)
        except Exception as e:
            logger.error(f"❌ Failed to get product count: {str(e)}")
            return 0


# Singleton instance
_naver_shopping_api = None

def get_naver_shopping_api() -> NaverShoppingAPI:
    """Get or create Naver Shopping API instance"""
    global _naver_shopping_api
    if _naver_shopping_api is None:
        _naver_shopping_api = NaverShoppingAPI()
    return _naver_shopping_api
