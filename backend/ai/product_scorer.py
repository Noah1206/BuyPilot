"""
Product Scorer - AI-powered product scoring and evaluation
"""
import os
import logging
from typing import Dict, Any
import google.generativeai as genai

logger = logging.getLogger(__name__)


class ProductScorer:
    """AI-powered product scoring system"""

    def __init__(self):
        """Initialize with Gemini API key"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("⚠️ GEMINI_API_KEY not configured. Product scoring will use fallback.")
            self.client = None
        else:
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("✅ ProductScorer initialized (Gemini 2.0 Flash)")

    def score_product(self, product: Dict[str, Any], keyword: str) -> Dict[str, Any]:
        """
        Comprehensively score a product

        Args:
            product: Product data from Taobao
            keyword: Discovery keyword

        Returns:
            Dictionary with scores and breakdown
        """
        logger.info(f"🎯 Scoring product: {product.get('title', 'Unknown')[:50]}...")

        try:
            # Calculate individual scores
            sales_score = self._predict_sales(product, keyword)
            price_score = self._analyze_price(product)
            quality_score = self._analyze_quality(product)
            image_score = self._analyze_images(product)

            # Calculate weighted total
            weights = {
                'sales_prediction': 0.35,
                'price_competitiveness': 0.25,
                'quality_score': 0.25,
                'image_quality': 0.15
            }

            total_score = (
                sales_score * weights['sales_prediction'] +
                price_score * weights['price_competitiveness'] +
                quality_score * weights['quality_score'] +
                image_score * weights['image_quality']
            )

            result = {
                'total_score': round(total_score, 2),
                'breakdown': {
                    'sales_prediction': sales_score,
                    'price_competitiveness': price_score,
                    'quality_score': quality_score,
                    'image_quality': image_score
                },
                'recommendation': total_score >= 70,  # Recommend if score >= 70
                'reason': self._generate_reason(total_score, sales_score, price_score, quality_score, image_score)
            }

            logger.info(f"✅ Product scored: {total_score:.1f}/100")
            return result

        except Exception as e:
            logger.error(f"❌ Error scoring product: {str(e)}")
            return {
                'total_score': 0,
                'breakdown': {},
                'recommendation': False,
                'reason': f'스코어링 실패: {str(e)}'
            }

    def _predict_sales(self, product: Dict[str, Any], keyword: str) -> float:
        """
        Predict sales potential using AI

        Args:
            product: Product data
            keyword: Discovery keyword

        Returns:
            Score 0-100
        """
        try:
            title = product.get('title', '')
            price = product.get('price', 0)
            seller = product.get('seller_nick', '')
            rating = product.get('score', 0)

            prompt = f"""
한국 온라인 쇼핑몰에서 다음 상품의 판매 가능성을 0-100점으로 평가하세요.

상품 정보:
- 제목: {title}
- 가격: {price} CNY
- 판매자 평점: {rating}
- 발견 키워드: {keyword}

평가 기준:
1. 키워드와 상품의 연관성
2. 한국 시장에서의 수요
3. 가격 경쟁력
4. 제목의 매력도

점수만 숫자로 응답하세요 (0-100).
"""

            if not self.client:
                logger.warning("⚠️ Sales prediction failed, using heuristic")
                return self._heuristic_sales_prediction(product, keyword)

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a sales prediction expert. Respond with only a number between 0-100."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=10
            )

            score = float(response.choices[0].message.content.strip())
            return max(0, min(100, score))  # Clamp to 0-100

        except Exception as e:
            logger.warning(f"⚠️ Sales prediction failed, using heuristic: {e}")
            return self._heuristic_sales_score(product)

    def _analyze_price(self, product: Dict[str, Any]) -> float:
        """
        Analyze price competitiveness

        Args:
            product: Product data

        Returns:
            Score 0-100
        """
        try:
            price_cny = float(product.get('price', 0))

            # Convert CNY to KRW (approximate exchange rate)
            exchange_rate = 180  # 1 CNY = 180 KRW
            price_krw = price_cny * exchange_rate

            # Add shipping and margin
            shipping = 5000  # 5,000 KRW average shipping
            cost = price_krw + shipping
            margin = cost * 0.3  # 30% margin
            final_price = cost + margin

            # Score based on final price range
            if final_price < 20000:
                return 95  # Excellent price point
            elif final_price < 50000:
                return 85  # Good price point
            elif final_price < 100000:
                return 70  # Medium price point
            elif final_price < 200000:
                return 50  # High price point
            else:
                return 30  # Very high price point

        except Exception as e:
            logger.warning(f"⚠️ Price analysis failed: {e}")
            return 50

    def _analyze_quality(self, product: Dict[str, Any]) -> float:
        """
        Analyze product quality indicators

        Args:
            product: Product data

        Returns:
            Score 0-100
        """
        try:
            rating = float(product.get('score', 0))
            stock = int(product.get('num', 0))
            seller = product.get('seller_nick', '')

            score = 0

            # Rating score (0-5 → 0-50 points)
            score += (rating / 5.0) * 50

            # Stock score (0-25 points)
            if stock > 1000:
                score += 25
            elif stock > 500:
                score += 20
            elif stock > 100:
                score += 15
            elif stock > 10:
                score += 10
            else:
                score += 5

            # Seller score (0-25 points)
            if len(seller) > 0:
                score += 25
            else:
                score += 10

            return min(100, score)

        except Exception as e:
            logger.warning(f"⚠️ Quality analysis failed: {e}")
            return 50

    def _analyze_images(self, product: Dict[str, Any]) -> float:
        """
        Analyze image quality and quantity

        Args:
            product: Product data

        Returns:
            Score 0-100
        """
        try:
            images = product.get('images', [])
            pic_url = product.get('pic_url', '')

            # Count images
            image_count = len(images)
            if not images and pic_url:
                image_count = 1

            # Score based on image count
            if image_count >= 5:
                return 100
            elif image_count >= 3:
                return 80
            elif image_count >= 1:
                return 60
            else:
                return 20

        except Exception as e:
            logger.warning(f"⚠️ Image analysis failed: {e}")
            return 50

    def _heuristic_sales_score(self, product: Dict[str, Any]) -> float:
        """Fallback heuristic scoring if AI fails"""
        try:
            rating = float(product.get('score', 0))
            price = float(product.get('price', 0))

            score = 50  # Base score

            # Bonus for high rating
            if rating >= 4.8:
                score += 20
            elif rating >= 4.5:
                score += 10

            # Bonus for good price range
            if 50 <= price <= 200:
                score += 15
            elif 20 <= price <= 300:
                score += 5

            return min(100, score)

        except Exception:
            return 50

    def _generate_reason(
        self,
        total: float,
        sales: float,
        price: float,
        quality: float,
        image: float
    ) -> str:
        """Generate recommendation reason"""
        if total >= 85:
            return f"우수한 상품입니다. 판매 예측 {sales:.0f}점, 가격 경쟁력 {price:.0f}점으로 높은 수익이 예상됩니다."
        elif total >= 70:
            return f"양호한 상품입니다. 전체 점수 {total:.0f}점으로 등록을 추천합니다."
        elif total >= 50:
            return f"보통 상품입니다. 품질({quality:.0f}점)과 이미지({image:.0f}점)를 검토하세요."
        else:
            return f"낮은 점수({total:.0f}점)로 등록을 권장하지 않습니다."


# Singleton instance
_product_scorer = None

def get_product_scorer() -> ProductScorer:
    """Get singleton ProductScorer instance"""
    global _product_scorer
    if _product_scorer is None:
        _product_scorer = ProductScorer()
    return _product_scorer
