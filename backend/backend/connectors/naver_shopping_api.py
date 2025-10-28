"""
Naver Shopping API Client
Uses Naver Search API to find popular products by keyword
"""
import os
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class NaverShoppingAPI:
    """네이버 쇼핑 검색 API 클라이언트"""

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        """
        Initialize Naver Shopping API client

        Args:
            client_id: Naver API Client ID
            client_secret: Naver API Client Secret
        """
        self.client_id = client_id or os.getenv('NAVER_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('NAVER_CLIENT_SECRET')

        if not self.client_id or not self.client_secret:
            logger.warning("⚠️ Naver API credentials not configured")
            raise ValueError("NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required")

        self.base_url = "https://openapi.naver.com/v1/search/shop.json"
        logger.info("✅ Naver Shopping API client initialized")

    def search_products(
        self,
        keyword: str,
        display: int = 100,
        sort: str = 'sim',
        start: int = 1,
        filter_smartstore: bool = False
    ) -> List[Dict[str, Any]]:
        """
        네이버 쇼핑 상품 검색

        Args:
            keyword: 검색 키워드 (예: "청바지", "맨투맨")
            display: 검색 결과 개수 (최대 100)
            sort: 정렬 방식
                - 'sim': 유사도순 (기본값)
                - 'date': 날짜순
                - 'asc': 가격 낮은순
                - 'dsc': 가격 높은순
            start: 검색 시작 위치 (1~1000)
            filter_smartstore: 스마트스토어만 필터링 (True/False)

        Returns:
            상품 목록 (최대 100개)
        """
        try:
            # Prepare query (requests will handle URL encoding)
            query = keyword
            if filter_smartstore:
                query = f"{keyword} site:smartstore.naver.com"

            headers = {
                'X-Naver-Client-Id': self.client_id,
                'X-Naver-Client-Secret': self.client_secret
            }

            params = {
                'query': query,  # requests will auto-encode
                'display': min(display, 100),  # Max 100
                'start': start,
                'sort': sort
            }

            logger.info(f"🔍 Searching Naver Shopping: keyword='{keyword}', display={display}, sort={sort}")

            response = requests.get(self.base_url, headers=headers, params=params, timeout=10)

            if response.status_code == 200:
                result = response.json()
                items = result.get('items', [])

                logger.info(f"✅ Found {len(items)} products (total: {result.get('total', 0)})")

                # Transform to our format
                products = []
                for idx, item in enumerate(items, 1):
                    product = self._transform_product(item, idx)
                    products.append(product)

                return products

            elif response.status_code == 401:
                logger.error("❌ API Authentication failed - Check Client ID/Secret")
                raise Exception("Naver API authentication failed")

            elif response.status_code == 429:
                logger.error("❌ API Rate limit exceeded")
                raise Exception("Too many requests - try again later")

            else:
                logger.error(f"❌ API Error: {response.status_code} - {response.text}")
                raise Exception(f"Naver API error: {response.status_code}")

        except requests.exceptions.Timeout:
            logger.error("❌ API request timeout")
            raise Exception("Request timeout - try again")

        except Exception as e:
            logger.error(f"❌ Error searching products: {str(e)}")
            raise

    def _transform_product(self, item: Dict[str, Any], rank: int) -> Dict[str, Any]:
        """
        네이버 쇼핑 API 응답을 우리 포맷으로 변환

        Args:
            item: Naver API item
            rank: 순위

        Returns:
            Transformed product data
        """
        # Remove HTML tags from title
        import re
        title = re.sub(r'<[^>]+>', '', item.get('title', ''))

        # Extract price (lprice is string with won)
        try:
            price = int(item.get('lprice', '0'))
        except (ValueError, TypeError):
            price = 0

        # Extract product ID from link
        product_id = item.get('productId', '')
        if not product_id:
            # Try to extract from link
            link = item.get('link', '')
            if 'productId=' in link:
                product_id = link.split('productId=')[1].split('&')[0]

        return {
            'title': title,
            'price': price,
            'image_url': item.get('image', ''),
            'product_url': item.get('link', ''),
            'product_id': product_id,
            'mall_name': item.get('mallName', ''),
            'brand': item.get('brand', ''),
            'maker': item.get('maker', ''),
            'category1': item.get('category1', ''),
            'category2': item.get('category2', ''),
            'category3': item.get('category3', ''),
            'category4': item.get('category4', ''),
            'rank': rank,
            'popularity_score': 100 - rank,  # Simple score based on rank
            # Note: API doesn't provide review_count, purchase_count, rating
            # These would be 0 or estimated
            'review_count': 0,
            'purchase_count': 0,
            'rating': 0
        }

    def search_popular_products(
        self,
        keyword: str,
        max_products: int = 100,
        min_price: int = 0,
        max_price: int = 0
    ) -> List[Dict[str, Any]]:
        """
        인기 상품 검색 (가격 필터링 포함)

        Args:
            keyword: 검색 키워드
            max_products: 최대 상품 수
            min_price: 최소 가격 (0 = 제한 없음)
            max_price: 최대 가격 (0 = 제한 없음)

        Returns:
            필터링된 인기 상품 목록
        """
        # Search by similarity (most relevant)
        products = self.search_products(
            keyword=keyword,
            display=min(max_products, 100),
            sort='sim'  # Similarity = popularity
        )

        # Apply price filters
        if min_price > 0 or max_price > 0:
            filtered = []
            for product in products:
                price = product.get('price', 0)
                if min_price > 0 and price < min_price:
                    continue
                if max_price > 0 and price > max_price:
                    continue
                filtered.append(product)

            logger.info(f"   Filtered by price: {len(products)} → {len(filtered)}")
            return filtered[:max_products]

        return products[:max_products]


# Singleton instance
_shopping_api = None


def get_shopping_api() -> NaverShoppingAPI:
    """Get or create NaverShoppingAPI singleton"""
    global _shopping_api

    if _shopping_api is None:
        _shopping_api = NaverShoppingAPI()

    return _shopping_api
