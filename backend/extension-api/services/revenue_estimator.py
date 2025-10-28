"""
Revenue Estimation Algorithm
Estimates monthly revenue based on search volume, price, and conversion metrics
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class RevenueEstimator:
    """
    Revenue Estimation Engine
    Formula: Monthly Revenue = Search Volume × Click Rate × Conversion Rate × Avg Price
    """

    # Industry average metrics
    DEFAULT_CLICK_RATE = 0.03  # 3% CTR
    DEFAULT_CONVERSION_RATE = 0.02  # 2% conversion
    DEFAULT_PURCHASE_AMOUNT = 1.2  # 1.2 items per order

    def __init__(self):
        pass

    def estimate_revenue(
        self,
        monthly_search_volume: int,
        avg_price: int,
        click_rate: float = None,
        conversion_rate: float = None,
        competition_level: str = 'medium'
    ) -> Dict[str, Any]:
        """
        Estimate monthly revenue for a keyword

        Args:
            monthly_search_volume: Monthly search count
            avg_price: Average product price (KRW)
            click_rate: Click-through rate (override default)
            conversion_rate: Purchase conversion rate (override default)
            competition_level: 'low', 'medium', or 'high'

        Returns:
            Revenue estimation data
        """
        # Adjust rates based on competition
        adjusted_click_rate = click_rate or self._get_adjusted_click_rate(competition_level)
        adjusted_conversion_rate = conversion_rate or self._get_adjusted_conversion_rate(competition_level)

        # Calculate metrics
        monthly_clicks = int(monthly_search_volume * adjusted_click_rate)
        monthly_conversions = int(monthly_clicks * adjusted_conversion_rate)
        monthly_revenue = int(monthly_conversions * avg_price * self.DEFAULT_PURCHASE_AMOUNT)

        return {
            'monthly_revenue': monthly_revenue,
            'monthly_clicks': monthly_clicks,
            'monthly_conversions': monthly_conversions,
            'click_rate': adjusted_click_rate,
            'conversion_rate': adjusted_conversion_rate,
            'avg_price': avg_price,
            'assumptions': {
                'purchase_amount': self.DEFAULT_PURCHASE_AMOUNT,
                'competition_adjustment': self._get_competition_multiplier(competition_level)
            }
        }

    def _get_adjusted_click_rate(self, competition_level: str) -> float:
        """Adjust click rate based on competition"""
        multipliers = {
            'low': 1.3,     # 3.9% CTR
            'medium': 1.0,  # 3.0% CTR
            'high': 0.7     # 2.1% CTR
        }
        multiplier = multipliers.get(competition_level, 1.0)
        return self.DEFAULT_CLICK_RATE * multiplier

    def _get_adjusted_conversion_rate(self, competition_level: str) -> float:
        """Adjust conversion rate based on competition"""
        multipliers = {
            'low': 1.5,     # 3.0% conversion
            'medium': 1.0,  # 2.0% conversion
            'high': 0.6     # 1.2% conversion
        }
        multiplier = multipliers.get(competition_level, 1.0)
        return self.DEFAULT_CONVERSION_RATE * multiplier

    def _get_competition_multiplier(self, competition_level: str) -> float:
        """Get overall competition multiplier"""
        multipliers = {
            'low': 1.4,
            'medium': 1.0,
            'high': 0.65
        }
        return multipliers.get(competition_level, 1.0)

    def calculate_competition_score(
        self,
        search_volume: int,
        product_count: int,
        avg_review_count: float = 0,
        new_product_rate: float = 0
    ) -> Dict[str, Any]:
        """
        Calculate competition score (0-100)

        Args:
            search_volume: Monthly search volume
            product_count: Number of competing products
            avg_review_count: Average review count of top products
            new_product_rate: Rate of new product entries (0-1)

        Returns:
            Competition score and analysis
        """
        # Base score: product count per 1000 searches
        if search_volume == 0:
            base_score = 100
        else:
            base_score = min((product_count / search_volume) * 1000, 100)

        # Adjust for review count (indicates established competition)
        review_multiplier = 1.0
        if avg_review_count > 1000:
            review_multiplier = 1.3
        elif avg_review_count > 500:
            review_multiplier = 1.15
        elif avg_review_count > 100:
            review_multiplier = 1.05

        # Adjust for new product entry rate
        entry_multiplier = 1.0 + (new_product_rate * 0.5)

        # Final score
        final_score = int(min(base_score * review_multiplier * entry_multiplier, 100))

        # Determine level
        if final_score < 30:
            level = 'low'
        elif final_score < 70:
            level = 'medium'
        else:
            level = 'high'

        return {
            'score': final_score,
            'level': level,
            'factors': {
                'base_score': int(base_score),
                'review_multiplier': review_multiplier,
                'entry_multiplier': entry_multiplier
            },
            'recent_1month': round(base_score / 10, 2),
            'expected_1month': round((base_score * 0.9) / 10, 2),
            'expected_3month': round((base_score * 0.85) / 10, 2)
        }


# Singleton instance
_revenue_estimator = None

def get_revenue_estimator() -> RevenueEstimator:
    """Get or create RevenueEstimator instance"""
    global _revenue_estimator
    if _revenue_estimator is None:
        _revenue_estimator = RevenueEstimator()
    return _revenue_estimator
