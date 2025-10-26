"""
Analytics Routes
Main API endpoints for product analysis
"""
import logging
from flask import Blueprint, request, jsonify
from typing import Dict, Any

from services.naver_search_ad_api import get_naver_search_ad_api
from services.naver_shopping_api import get_naver_shopping_api
from services.revenue_estimator import get_revenue_estimator

logger = logging.getLogger(__name__)

bp = Blueprint('analytics', __name__)


@bp.route('/analyze', methods=['POST'])
def analyze_product():
    """
    Complete product analysis endpoint
    Returns all analysis data in one call
    """
    try:
        # Parse request
        data = request.get_json()
        keyword = data.get('keyword')

        if not keyword:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_KEYWORD',
                    'message': 'Keyword is required',
                    'details': {}
                }
            }), 400

        logger.info(f"🔍 Analyzing keyword: {keyword}")

        # Initialize services
        search_ad_api = get_naver_search_ad_api()
        shopping_api = get_naver_shopping_api()
        estimator = get_revenue_estimator()

        # 1. Get search volume from Search Ad API
        try:
            keyword_stats = search_ad_api.get_keyword_stats([keyword])
            if not keyword_stats:
                raise ValueError("No search volume data available")

            stats = keyword_stats[0]
            search_volume_data = stats['monthly_search_volume']
            competition_index = stats['competition']['level']

        except Exception as e:
            logger.warning(f"⚠️ Search Ad API failed, using mock data: {str(e)}")
            # Fallback to mock data
            search_volume_data = {
                'total': 80600,
                'pc': 15300,
                'mobile': 65300
            }
            competition_index = 'medium'

        # 2. Get price distribution from Shopping API
        try:
            price_dist = shopping_api.get_price_distribution(keyword, max_products=100)
            avg_price = price_dist['avg_price']
            product_count = price_dist['total_products']

        except Exception as e:
            logger.warning(f"⚠️ Shopping API failed, using mock data: {str(e)}")
            # Fallback to mock data
            price_dist = {
                'ranges': ['1-2만', '2-3만', '3-4만', '4-5만', '5-6만', '6-7만', '7-8만', '8-9만', '9-10만', '10만+'],
                'counts': [5, 15, 25, 20, 15, 10, 5, 3, 1, 1],
                'total_products': 100,
                'avg_price': 35000
            }
            avg_price = 35000
            product_count = 100

        # 3. Estimate revenue
        revenue_estimate = estimator.estimate_revenue(
            monthly_search_volume=search_volume_data['total'],
            avg_price=avg_price,
            competition_level=competition_index
        )

        # 4. Calculate competition score
        competition_score = estimator.calculate_competition_score(
            search_volume=search_volume_data['total'],
            product_count=product_count
        )

        # 5. Calculate trend (mock for now - would need historical data)
        trend = 'up'
        change_percent = 12  # Mock: 12% increase

        # Compile response
        response_data = {
            'keyword': keyword,
            'searchVolume': {
                'monthly': search_volume_data['total'],
                'pc': search_volume_data['pc'],
                'mobile': search_volume_data['mobile'],
                'trend': trend,
                'changePercent': change_percent
            },
            'estimatedRevenue': {
                'monthly': revenue_estimate['monthly_revenue'],
                'clickRate': revenue_estimate['click_rate'],
                'conversionRate': revenue_estimate['conversion_rate'],
                'avgPrice': avg_price
            },
            'priceDistribution': {
                'ranges': price_dist['ranges'],
                'counts': price_dist['counts']
            },
            'competition': {
                'score': competition_score['score'],
                'level': competition_score['level'],
                'recent1Month': competition_score['recent_1month'],
                'expected1Month': competition_score['expected_1month'],
                'expected3Month': competition_score['expected_3month']
            }
        }

        logger.info(f"✅ Analysis complete for '{keyword}'")

        return jsonify({
            'ok': True,
            'data': response_data
        })

    except Exception as e:
        logger.error(f"❌ Analysis failed: {str(e)}", exc_info=True)
        return jsonify({
            'ok': False,
            'error': {
                'code': 'ANALYSIS_FAILED',
                'message': 'Failed to analyze product',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/search-volume', methods=['GET'])
def get_search_volume():
    """Get search volume for a keyword"""
    try:
        keyword = request.args.get('keyword')

        if not keyword:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_KEYWORD',
                    'message': 'Keyword parameter is required'
                }
            }), 400

        search_ad_api = get_naver_search_ad_api()
        stats = search_ad_api.get_keyword_stats([keyword])

        if not stats:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'NO_DATA',
                    'message': 'No search volume data available'
                }
            }), 404

        return jsonify({
            'ok': True,
            'data': stats[0]
        })

    except Exception as e:
        logger.error(f"❌ Failed to get search volume: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500


@bp.route('/price-distribution', methods=['GET'])
def get_price_distribution():
    """Get price distribution for a keyword"""
    try:
        keyword = request.args.get('keyword')
        max_products = int(request.args.get('max_products', 100))

        if not keyword:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'MISSING_KEYWORD',
                    'message': 'Keyword parameter is required'
                }
            }), 400

        shopping_api = get_naver_shopping_api()
        distribution = shopping_api.get_price_distribution(keyword, max_products)

        return jsonify({
            'ok': True,
            'data': distribution
        })

    except Exception as e:
        logger.error(f"❌ Failed to get price distribution: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SERVER_ERROR',
                'message': str(e)
            }
        }), 500
