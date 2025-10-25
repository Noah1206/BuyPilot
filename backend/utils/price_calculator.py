"""
Price Calculator - 판매가 및 배송비 자동 계산
중국 배송대행비, 환율, 마진을 고려한 최종 판매가 산출
"""
import os
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class ShippingCalculator:
    """중국 배송대행비 자동 계산"""

    # 무게 기반 배송비 테이블 (kg: 원)
    WEIGHT_BASED_RATES = {
        0.5: 5000,   # 500g 이하: 5,000원
        1.0: 7000,   # 1kg 이하: 7,000원
        2.0: 10000,  # 2kg 이하: 10,000원
        3.0: 13000,  # 3kg 이하: 13,000원
        5.0: 18000,  # 5kg 이하: 18,000원
    }

    # 부피 무게 계산 (가로 x 세로 x 높이 / 6000)
    VOLUME_DIVISOR = 6000

    # 카테고리별 평균 무게 (kg)
    CATEGORY_WEIGHTS = {
        '의류': 0.3,
        '티셔츠': 0.2,
        '맨투맨': 0.4,
        '후드': 0.5,
        '코트': 0.8,
        '패딩': 1.0,
        '바지': 0.5,
        '신발': 0.8,
        '운동화': 0.9,
        '슬리퍼': 0.3,
        '가방': 0.5,
        '백팩': 0.7,
        '크로스백': 0.3,
        '악세서리': 0.1,
        '모자': 0.2,
        '전자제품': 0.5,
        '이어폰': 0.1,
        '보조배터리': 0.3,
        '기타': 0.5,
    }

    def calculate_shipping(
        self,
        weight_kg: Optional[float] = None,
        dimensions: Optional[Dict[str, float]] = None,
        title: str = ''
    ) -> Dict[str, Any]:
        """
        배송비 계산

        Args:
            weight_kg: 실제 무게 (kg)
            dimensions: {'length': 30, 'width': 20, 'height': 10} (cm)
            title: 상품명 (카테고리 추론용)

        Returns:
            {
                'shipping_fee': 7000,
                'weight_used': 0.8,
                'actual_weight': 0.8,
                'volume_weight': None,
                'calculation_method': 'actual_weight',
                'estimated': True
            }
        """
        try:
            estimated = False

            # 1. 무게 추정 (없을 경우 제목에서 카테고리 추론)
            if not weight_kg:
                weight_kg = self._estimate_weight_from_title(title)
                estimated = True

            # 2. 부피 무게 계산
            volume_weight = None
            if dimensions:
                volume = (
                    dimensions['length'] *
                    dimensions['width'] *
                    dimensions['height']
                )
                volume_weight = volume / self.VOLUME_DIVISOR

            # 3. 실제 무게 vs 부피 무게 중 큰 값 사용
            final_weight = max(
                weight_kg,
                volume_weight if volume_weight else 0
            )

            # 4. 배송비 조회
            shipping_fee = self._get_fee_by_weight(final_weight)

            calc_method = 'volume' if volume_weight and volume_weight > weight_kg else 'actual'
            if estimated:
                calc_method = 'estimated'

            return {
                'shipping_fee': shipping_fee,
                'weight_used': round(final_weight, 2),
                'actual_weight': round(weight_kg, 2) if weight_kg else None,
                'volume_weight': round(volume_weight, 2) if volume_weight else None,
                'calculation_method': calc_method,
                'estimated': estimated
            }

        except Exception as e:
            logger.error(f"❌ Shipping calculation failed: {str(e)}")
            # Return default
            return {
                'shipping_fee': 7000,
                'weight_used': 0.5,
                'calculation_method': 'default',
                'estimated': True
            }

    def _estimate_weight_from_title(self, title: str) -> float:
        """제목에서 카테고리 추론하여 평균 무게 반환"""
        title_lower = title.lower()

        for category, weight in self.CATEGORY_WEIGHTS.items():
            if category in title_lower or category in title:
                logger.info(f"   Estimated weight from title: {category} -> {weight}kg")
                return weight

        # 기본값
        return 0.5

    def _get_fee_by_weight(self, weight_kg: float) -> int:
        """무게에 따른 배송비 조회"""
        for max_weight, fee in sorted(self.WEIGHT_BASED_RATES.items()):
            if weight_kg <= max_weight:
                return fee

        # 5kg 초과: 1kg당 3,500원 추가
        base_fee = self.WEIGHT_BASED_RATES[5.0]
        import math
        extra_kg = math.ceil(weight_kg - 5.0)
        return base_fee + (extra_kg * 3500)


class PriceCalculator:
    """판매가 자동 계산"""

    def __init__(self):
        self.exchange_rate = self._get_exchange_rate()
        self.shipping_calculator = ShippingCalculator()

    def calculate_selling_price(
        self,
        taobao_price_cny: float,
        title: str = '',
        target_margin: float = 0.35,
        weight_kg: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        판매가 자동 계산

        Formula:
        판매가 = (타오바오 가격 * 환율 + 배송비) / (1 - 마진율)

        Args:
            taobao_price_cny: 타오바오 가격 (위안)
            title: 상품명 (배송비 추정용)
            target_margin: 목표 마진율 (기본 35%)
            weight_kg: 무게 (선택)

        Returns:
            {
                'taobao_price_cny': 89.0,
                'taobao_price_krw': 16900,
                'exchange_rate': 190,
                'shipping_fee': 7000,
                'total_cost': 23900,
                'target_margin': 0.35,
                'selling_price': 36770,
                'selling_price_rounded': 36900,
                'expected_profit': 13000,
                'actual_margin': 0.352
            }
        """
        try:
            # 1. 환율 적용
            taobao_price_krw = int(taobao_price_cny * self.exchange_rate)

            # 2. 배송비 계산
            shipping_result = self.shipping_calculator.calculate_shipping(
                weight_kg=weight_kg,
                title=title
            )
            shipping_fee = shipping_result['shipping_fee']

            # 3. 총 원가
            total_cost = taobao_price_krw + shipping_fee

            # 4. 판매가 계산 (마진율 고려)
            selling_price = total_cost / (1 - target_margin)

            # 5. 100원 단위 반올림
            selling_price_rounded = round(selling_price / 100) * 100

            # 6. 실제 마진 계산
            expected_profit = selling_price_rounded - total_cost
            actual_margin = expected_profit / selling_price_rounded if selling_price_rounded > 0 else 0

            return {
                'taobao_price_cny': taobao_price_cny,
                'taobao_price_krw': taobao_price_krw,
                'exchange_rate': self.exchange_rate,
                'shipping_fee': shipping_fee,
                'shipping_details': shipping_result,
                'total_cost': total_cost,
                'target_margin': target_margin,
                'selling_price': int(selling_price),
                'selling_price_rounded': selling_price_rounded,
                'expected_profit': expected_profit,
                'actual_margin': round(actual_margin, 3)
            }

        except Exception as e:
            logger.error(f"❌ Price calculation failed: {str(e)}")
            # Return default
            return {
                'taobao_price_cny': taobao_price_cny,
                'taobao_price_krw': int(taobao_price_cny * 190),
                'exchange_rate': 190,
                'shipping_fee': 7000,
                'total_cost': int(taobao_price_cny * 190) + 7000,
                'error': str(e)
            }

    def _get_exchange_rate(self) -> float:
        """
        실시간 환율 조회 (CNY to KRW)

        API: https://api.exchangerate-api.com/v4/latest/CNY
        """
        try:
            logger.info("🔄 Fetching CNY to KRW exchange rate...")

            response = requests.get(
                'https://api.exchangerate-api.com/v4/latest/CNY',
                timeout=5
            )
            response.raise_for_status()

            data = response.json()
            krw_rate = data['rates']['KRW']

            logger.info(f"✅ Exchange rate: 1 CNY = {krw_rate:.2f} KRW")
            return krw_rate

        except Exception as e:
            logger.warning(f"⚠️ Exchange rate API failed, using default: {str(e)}")
            return 190.0  # 기본값

    def batch_calculate(self, products: list) -> list:
        """
        배치 가격 계산

        Args:
            products: [{
                'taobao_price_cny': 89,
                'title': '맨투맨',
                ...
            }]

        Returns:
            같은 리스트에 price_info 추가
        """
        results = []

        for product in products:
            price_cny = product.get('taobao_price_cny') or product.get('price', 0)
            title = product.get('title', '')

            price_info = self.calculate_selling_price(
                taobao_price_cny=price_cny,
                title=title
            )

            product['price_info'] = price_info
            results.append(product)

        return results


# Singleton instances
_price_calculator = None

def get_price_calculator() -> PriceCalculator:
    """Get singleton PriceCalculator instance"""
    global _price_calculator
    if _price_calculator is None:
        _price_calculator = PriceCalculator()
    return _price_calculator
