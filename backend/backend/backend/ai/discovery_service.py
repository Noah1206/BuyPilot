"""
Discovery Service - Complete AI product discovery workflow
"""
import logging
from typing import List, Dict, Any
from datetime import datetime

from ai.keyword_analyzer import get_keyword_analyzer
from ai.product_finder import get_product_finder
from ai.product_scorer import get_product_scorer
from models import get_db, ProductCandidate, CandidateStatus

logger = logging.getLogger(__name__)


class DiscoveryService:
    """Complete AI product discovery service"""

    def __init__(self):
        """Initialize all AI components"""
        self.keyword_analyzer = get_keyword_analyzer()
        self.product_finder = get_product_finder()
        self.product_scorer = get_product_scorer()
        logger.info("✅ DiscoveryService initialized")

    def discover_products(
        self,
        category: str = "fashion",
        keyword_count: int = 5,
        products_per_keyword: int = 10,
        min_score: float = 70
    ) -> Dict[str, Any]:
        """
        Complete product discovery workflow

        Args:
            category: Product category
            keyword_count: Number of keywords to analyze
            products_per_keyword: Products to find per keyword
            min_score: Minimum AI score to save (0-100)

        Returns:
            Discovery results summary
        """
        logger.info(f"🚀 Starting product discovery for category: {category}")

        results = {
            'category': category,
            'keywords_analyzed': 0,
            'products_found': 0,
            'products_scored': 0,
            'products_saved': 0,
            'candidates': [],
            'started_at': datetime.utcnow().isoformat(),
            'completed_at': None
        }

        try:
            # Step 1: Get trending keywords
            logger.info("📊 Step 1: Analyzing trending keywords...")
            keywords = self.keyword_analyzer.get_trending_keywords(
                category=category,
                count=keyword_count
            )
            results['keywords_analyzed'] = len(keywords)

            # Step 2: Search products for each keyword
            for keyword_data in keywords:
                keyword = keyword_data.get('keyword', '')
                logger.info(f"🔍 Step 2: Searching products for keyword: {keyword}")

                products = self.product_finder.search_products(
                    keyword=keyword,
                    max_results=products_per_keyword
                )
                results['products_found'] += len(products)

                # Step 3: Score and save products
                for product in products:
                    logger.info(f"🎯 Step 3: Scoring product: {product.get('title', '')[:50]}...")

                    # Score product
                    score_result = self.product_scorer.score_product(product, keyword)
                    results['products_scored'] += 1

                    # Save if score is high enough
                    if score_result['total_score'] >= min_score:
                        candidate = self._save_candidate(
                            product=product,
                            keyword=keyword,
                            keyword_data=keyword_data,
                            score_result=score_result
                        )

                        if candidate:
                            results['products_saved'] += 1
                            results['candidates'].append(candidate.to_dict())

            results['completed_at'] = datetime.utcnow().isoformat()
            logger.info(f"✅ Discovery complete: {results['products_saved']} candidates saved")

            return results

        except Exception as e:
            logger.error(f"❌ Discovery failed: {str(e)}")
            results['error'] = str(e)
            return results

    def discover_by_keyword(
        self,
        keyword: str,
        max_products: int = 20,
        min_score: float = 70
    ) -> Dict[str, Any]:
        """
        Discover products for a specific keyword

        Args:
            keyword: Search keyword
            max_products: Maximum products to find
            min_score: Minimum AI score

        Returns:
            Discovery results
        """
        logger.info(f"🔍 Discovering products for keyword: {keyword}")

        results = {
            'keyword': keyword,
            'products_found': 0,
            'products_scored': 0,
            'products_saved': 0,
            'candidates': []
        }

        try:
            # Analyze keyword
            keyword_data = self.keyword_analyzer.analyze_keyword(keyword)

            # Search products
            products = self.product_finder.search_products(
                keyword=keyword,
                max_results=max_products
            )
            results['products_found'] = len(products)

            # Score and save
            for product in products:
                score_result = self.product_scorer.score_product(product, keyword)
                results['products_scored'] += 1

                if score_result['total_score'] >= min_score:
                    candidate = self._save_candidate(
                        product=product,
                        keyword=keyword,
                        keyword_data=keyword_data,
                        score_result=score_result
                    )

                    if candidate:
                        results['products_saved'] += 1
                        results['candidates'].append(candidate.to_dict())

            logger.info(f"✅ Found {results['products_saved']} candidates for keyword: {keyword}")
            return results

        except Exception as e:
            logger.error(f"❌ Discovery failed: {str(e)}")
            results['error'] = str(e)
            return results

    def _save_candidate(
        self,
        product: Dict[str, Any],
        keyword: str,
        keyword_data: Dict[str, Any],
        score_result: Dict[str, Any]
    ) -> ProductCandidate:
        """Save product candidate to database"""
        try:
            with get_db() as db:
                # Check if already exists
                existing = db.query(ProductCandidate).filter(
                    ProductCandidate.source == 'taobao',
                    ProductCandidate.source_item_id == product.get('taobao_item_id', '')
                ).first()

                if existing:
                    logger.warning(f"⚠️ Product already exists: {existing.id}")
                    return existing

                # Create new candidate
                candidate = ProductCandidate(
                    status=CandidateStatus.SCORED.value,

                    # Original data
                    source='taobao',
                    source_url=f"https://item.taobao.com/item.htm?id={product.get('taobao_item_id', '')}",
                    source_item_id=product.get('taobao_item_id', ''),
                    original_title=product.get('title', ''),
                    original_price=product.get('price', 0),
                    original_currency='CNY',
                    original_images=product.get('images', []),
                    original_data=product,

                    # AI Score
                    ai_score=score_result['total_score'],
                    score_breakdown=score_result['breakdown'],

                    # Keyword data
                    discovery_keyword=keyword,
                    keywords=[keyword],
                    trend_score=keyword_data.get('trend_score', 0),
                    search_volume=keyword_data.get('search_volume_estimate', 0)
                )

                db.add(candidate)
                db.commit()

                logger.info(f"💾 Saved candidate: {candidate.id} (score: {candidate.ai_score})")
                return candidate

        except Exception as e:
            logger.error(f"❌ Error saving candidate: {str(e)}")
            return None


# Singleton instance
_discovery_service = None

def get_discovery_service() -> DiscoveryService:
    """Get singleton DiscoveryService instance"""
    global _discovery_service
    if _discovery_service is None:
        _discovery_service = DiscoveryService()
    return _discovery_service
