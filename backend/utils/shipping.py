"""
Aceship GOLD Shipping Rate Calculator
Based on weight tiers from user's rate table
"""

# Aceship GOLD shipping rates (KRW)
ACESHIP_RATES = {
    0.5: 5600,
    1.0: 6400,
    1.5: 7200,
    2.0: 8000,
    2.5: 8800,
    3.0: 9600,
    3.5: 10400,
    4.0: 11200,
    4.5: 12000,
    5.0: 12800,
    5.5: 13600,
    6.0: 14400,
    6.5: 15200,
    7.0: 16000,
    7.5: 16800,
    8.0: 17600,
    8.5: 18400,
    9.0: 19200,
    9.5: 20000,
    10.0: 20800
}


def calculate_shipping_cost(weight_kg: float) -> int:
    """
    Calculate Aceship GOLD shipping cost based on weight

    Args:
        weight_kg: Product weight in kilograms

    Returns:
        Shipping cost in KRW
    """
    if weight_kg <= 0:
        return 0

    # Find the appropriate tier
    # Round up to nearest 0.5kg tier
    import math
    tier_weight = math.ceil(weight_kg * 2) / 2

    # Cap at 10kg (maximum in rate table)
    if tier_weight > 10.0:
        tier_weight = 10.0

    return ACESHIP_RATES.get(tier_weight, ACESHIP_RATES[10.0])


def get_all_rates() -> dict:
    """Return all Aceship GOLD rate tiers"""
    return ACESHIP_RATES.copy()


def estimate_shipping_for_price_range(min_price: int, max_price: int) -> dict:
    """
    Estimate shipping costs for a price range
    Useful for bulk calculations

    Returns dict with low/mid/high estimates
    """
    # Rough heuristic: lighter items for lower prices
    if max_price <= 10000:
        weight_estimate = 0.5
    elif max_price <= 30000:
        weight_estimate = 1.0
    elif max_price <= 50000:
        weight_estimate = 2.0
    else:
        weight_estimate = 3.0

    return {
        'low': calculate_shipping_cost(weight_estimate * 0.7),
        'mid': calculate_shipping_cost(weight_estimate),
        'high': calculate_shipping_cost(weight_estimate * 1.3)
    }
