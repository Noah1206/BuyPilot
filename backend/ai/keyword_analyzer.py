"""
Keyword Analyzer - AI-powered keyword trend analysis
"""
import os
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import google.generativeai as genai

logger = logging.getLogger(__name__)


class KeywordAnalyzer:
    """AI-powered keyword trend analyzer"""

    def __init__(self):
        """Initialize with Gemini API key"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("⚠️ GEMINI_API_KEY not configured. Keyword analysis will use fallback.")
            self.client = None
        else:
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("✅ KeywordAnalyzer initialized (Gemini 2.0 Flash)")

    def get_trending_keywords(self, category: str = "fashion", count: int = 10) -> List[Dict[str, Any]]:
        """
        Get trending keywords using AI

        Args:
            category: Product category (fashion, electronics, home, etc.)
            count: Number of keywords to return

        Returns:
            List of keyword dictionaries with trend data
        """
        logger.info(f"🔍 Getting trending keywords for category: {category}")

        try:
            # Get current season and month
            now = datetime.now()
            season = self._get_season(now.month)
            month = now.strftime("%B")

            # AI prompt for trending keywords
            prompt = f"""
당신은 한국 온라인 쇼핑 트렌드 전문가입니다.

현재 시점: {now.year}년 {now.month}월 ({season} 시즌)
카테고리: {category}

다음 조건에 맞는 인기 상품 키워드 {count}개를 추천해주세요:

1. 현재 시즌에 잘 팔리는 상품
2. 네이버 쇼핑/쿠팡에서 검색량이 높은 키워드
3. 타오바오에서 저렴하게 구매 가능한 상품
4. 마진율이 30% 이상 가능한 상품

각 키워드에 대해 다음 정보를 JSON 형식으로 제공하세요:
- keyword: 키워드 (한글)
- search_volume_estimate: 월간 예상 검색량 (숫자)
- trend_score: 트렌드 점수 (0-100)
- seasonality: 계절성 (high/medium/low)
- competition: 경쟁도 (high/medium/low)
- profit_potential: 수익성 (high/medium/low)
- reason: 추천 이유 (한 문장)

JSON 배열로만 응답하세요. 다른 설명은 불필요합니다.
"""

            if not self.client:
                logger.warning("⚠️ Using fallback keywords")
                return self._get_fallback_keywords(category, count)

            response = self.client.generate_content(prompt)

            # Parse response
            import json
            content = response.text

            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            keywords = json.loads(content)

            logger.info(f"✅ Got {len(keywords)} trending keywords")
            return keywords

        except Exception as e:
            logger.error(f"❌ Error getting trending keywords: {str(e)}")
            # Return fallback keywords
            return self._get_fallback_keywords(category, count)

    def analyze_keyword(self, keyword: str) -> Dict[str, Any]:
        """
        Analyze a single keyword for profitability

        Args:
            keyword: Keyword to analyze

        Returns:
            Dictionary with keyword analysis
        """
        logger.info(f"📊 Analyzing keyword: {keyword}")

        try:
            prompt = f"""
한국 온라인 쇼핑 시장에서 "{keyword}" 키워드를 분석해주세요.

다음 정보를 JSON 형식으로 제공하세요:
- keyword: "{keyword}"
- search_volume_estimate: 월간 예상 검색량
- trend_score: 트렌드 점수 (0-100)
- competition_level: 경쟁 강도 ("high"/"medium"/"low")
- profit_potential: 수익 가능성 ("high"/"medium"/"low")
- target_price_range: 타겟 가격대 (예: "20000-50000")
- best_platforms: 판매하기 좋은 플랫폼 배열 (예: ["smartstore", "coupang"])
- related_keywords: 관련 키워드 배열 (5개)
- recommendation: 추천 여부 (true/false)
- reason: 분석 이유 (2-3문장)

JSON으로만 응답하세요.
"""

            if not self.client:
                logger.warning("⚠️ Gemini not configured, using fallback")
                return {
                    "keyword": keyword,
                    "search_volume_estimate": 0,
                    "trend_score": 0,
                    "recommendation": False,
                    "reason": "AI not configured"
                }

            response = self.client.generate_content(prompt)

            import json
            content = response.text

            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            analysis = json.loads(content)
            logger.info(f"✅ Keyword analysis complete")
            return analysis

        except Exception as e:
            logger.error(f"❌ Error analyzing keyword: {str(e)}")
            return {
                "keyword": keyword,
                "search_volume_estimate": 0,
                "trend_score": 0,
                "recommendation": False,
                "reason": f"분석 실패: {str(e)}"
            }

    def _get_season(self, month: int) -> str:
        """Get season from month"""
        if month in [12, 1, 2]:
            return "겨울"
        elif month in [3, 4, 5]:
            return "봄"
        elif month in [6, 7, 8]:
            return "여름"
        else:
            return "가을"

    def _get_fallback_keywords(self, category: str, count: int) -> List[Dict[str, Any]]:
        """Get fallback keywords if AI fails"""
        logger.warning("⚠️ Using fallback keywords")

        fallback_db = {
            "fashion": [
                {"keyword": "맨투맨", "search_volume_estimate": 50000, "trend_score": 85},
                {"keyword": "후드티", "search_volume_estimate": 45000, "trend_score": 82},
                {"keyword": "기모 맨투맨", "search_volume_estimate": 30000, "trend_score": 88},
                {"keyword": "오버핏 티셔츠", "search_volume_estimate": 25000, "trend_score": 75},
                {"keyword": "와이드 팬츠", "search_volume_estimate": 20000, "trend_score": 70},
            ],
            "electronics": [
                {"keyword": "블루투스 이어폰", "search_volume_estimate": 40000, "trend_score": 80},
                {"keyword": "무선 충전기", "search_volume_estimate": 35000, "trend_score": 75},
                {"keyword": "보조배터리", "search_volume_estimate": 30000, "trend_score": 70},
            ],
            "home": [
                {"keyword": "수납 정리함", "search_volume_estimate": 25000, "trend_score": 72},
                {"keyword": "LED 무드등", "search_volume_estimate": 20000, "trend_score": 68},
            ]
        }

        keywords = fallback_db.get(category, fallback_db["fashion"])
        return keywords[:count]


# Singleton instance
_keyword_analyzer = None

def get_keyword_analyzer() -> KeywordAnalyzer:
    """Get singleton KeywordAnalyzer instance"""
    global _keyword_analyzer
    if _keyword_analyzer is None:
        _keyword_analyzer = KeywordAnalyzer()
    return _keyword_analyzer
