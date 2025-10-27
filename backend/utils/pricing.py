"""
Pricing calculator with 20% margin logic
Reverse-calculates costs from competitor prices
"""

from typing import Dict, Tuple
from .shipping import calculate_shipping_cost
from .category import estimate_weight_from_title, estimate_weight_from_price, get_category_from_title


# Fixed margin rate (20%)
MARGIN_RATE = 0.20


def calculate_cost_from_price(selling_price: int, margin_rate: float = MARGIN_RATE) -> int:
    """
    Reverse-calculate cost price from selling price with known margin

    Formula: cost_price = selling_price / (1 + margin_rate)

    Args:
        selling_price: Competitor's selling price in KRW
        margin_rate: Profit margin as decimal (default 0.20 = 20%)

    Returns:
        Estimated cost price in KRW
    """
    return int(selling_price / (1 + margin_rate))


def calculate_product_costs(product_title: str, competitor_price: int) -> Dict:
    """
    Calculate all costs for a product based on competitor price

    Workflow:
    1. Estimate weight from title
    2. Calculate shipping cost from weight
    3. Reverse-calculate cost price (20% margin)
    4. Calculate total cost and profit

    Args:
        product_title: Product title for weight estimation
        competitor_price: Competitor's selling price in KRW

    Returns:
        Dict with all cost breakdown:
        {
            'category': str,
            'estimated_weight': float,
            'cost_price': int,
            'shipping_cost': int,
            'total_cost': int,
            'selling_price': int,
            'profit': int,
            'profit_rate': float
        }
    """
    # Estimate product category and weight
    category = get_category_from_title(product_title)
    estimated_weight = estimate_weight_from_title(product_title)

    # If title matching failed, use price-based estimation
    if estimated_weight == 1.0 and category == "기타":
        estimated_weight = estimate_weight_from_price(competitor_price)

    # Calculate shipping cost
    shipping_cost = calculate_shipping_cost(estimated_weight)

    # Reverse-calculate cost price from competitor price
    cost_price = calculate_cost_from_price(competitor_price, MARGIN_RATE)

    # Calculate total cost
    total_cost = cost_price + shipping_cost

    # Calculate profit and profit rate
    profit = competitor_price - total_cost
    profit_rate = (profit / competitor_price * 100) if competitor_price > 0 else 0

    return {
        'category': category,
        'estimated_weight': round(estimated_weight, 2),
        'cost_price': cost_price,
        'shipping_cost': shipping_cost,
        'total_cost': total_cost,
        'selling_price': competitor_price,
        'profit': profit,
        'profit_rate': round(profit_rate, 2)
    }


def calculate_recommended_price(cost_price: int, shipping_cost: int, target_margin: float = MARGIN_RATE) -> Tuple[int, int]:
    """
    Calculate recommended selling price for target margin

    Args:
        cost_price: Product cost in KRW
        shipping_cost: Shipping cost in KRW
        target_margin: Desired profit margin (default 0.20)

    Returns:
        Tuple of (recommended_price, profit)
    """
    total_cost = cost_price + shipping_cost
    recommended_price = int(total_cost / (1 - target_margin))
    profit = recommended_price - total_cost

    return recommended_price, profit


def analyze_profitability(product_costs: Dict) -> Dict:
    """
    Analyze profitability of a product

    Args:
        product_costs: Dict from calculate_product_costs()

    Returns:
        Analysis dict with recommendations
    """
    profit_rate = product_costs['profit_rate']
    profit = product_costs['profit']

    # Profitability tiers
    if profit_rate >= 20:
        status = "excellent"
        recommendation = "좋은 마진율입니다. 판매를 추천합니다."
    elif profit_rate >= 15:
        status = "good"
        recommendation = "적정한 마진율입니다."
    elif profit_rate >= 10:
        status = "acceptable"
        recommendation = "마진이 낮습니다. 원가 절감을 고려하세요."
    else:
        status = "poor"
        recommendation = "마진이 너무 낮습니다. 다른 제품을 추천합니다."

    return {
        'status': status,
        'recommendation': recommendation,
        'is_profitable': profit > 0,
        'profit_tier': status
    }


def batch_calculate_costs(products: list) -> list:
    """
    Calculate costs for multiple products

    Args:
        products: List of dicts with 'title' and 'price' keys

    Returns:
        List of product cost dicts
    """
    results = []

    for product in products:
        costs = calculate_product_costs(
            product.get('title', ''),
            product.get('price', 0)
        )

        # Add original product data
        costs.update({
            'title': product.get('title', ''),
            'url': product.get('url', ''),
            'image_url': product.get('image_url', ''),
            'sales_count': product.get('sales_count', 0),
            'rating': product.get('rating', 0)
        })

        # Add profitability analysis
        analysis = analyze_profitability(costs)
        costs.update(analysis)

        results.append(costs)

    return results
