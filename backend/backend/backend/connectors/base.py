"""
Base connector interface for external APIs
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseConnector(ABC):
    """Base class for all external API connectors"""

    @abstractmethod
    def get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Get product information by product ID

        Args:
            product_id: Product identifier

        Returns:
            Dictionary containing product information or None if not found
        """
        pass

    @abstractmethod
    def search_products(self, keyword: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        Search products by keyword

        Args:
            keyword: Search keyword
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary containing search results
        """
        pass

    @abstractmethod
    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from URL

        Args:
            url: Product URL

        Returns:
            Product ID or None if invalid URL
        """
        pass
