"""
Discovery API routes
Handles AI-powered product discovery and candidate management
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import desc
import logging

from models import get_db, ProductCandidate, CandidateStatus
from ai.discovery_service import get_discovery_service

bp = Blueprint('discovery', __name__)
logger = logging.getLogger(__name__)


@bp.route('/discovery/start', methods=['POST'])
def start_discovery():
    """
    Start AI product discovery

    Body: {
        category: string,  # fashion, electronics, home, etc
        keyword_count: number,  # optional, default 5
        products_per_keyword: number,  # optional, default 10
        min_score: number  # optional, default 70
    }
    """
    try:
        data = request.get_json(force=True) or {}

        category = data.get('category', 'fashion')
        keyword_count = int(data.get('keyword_count', 5))
        products_per_keyword = int(data.get('products_per_keyword', 10))
        min_score = float(data.get('min_score', 70))

        logger.info(f"🚀 Starting discovery: category={category}, keywords={keyword_count}")

        # Get discovery service
        discovery = get_discovery_service()

        # Run discovery
        results = discovery.discover_products(
            category=category,
            keyword_count=keyword_count,
            products_per_keyword=products_per_keyword,
            min_score=min_score
        )

        return jsonify({
            'ok': True,
            'data': results
        }), 200

    except Exception as e:
        logger.error(f"❌ Discovery failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DISCOVERY_ERROR',
                'message': 'Failed to discover products',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/discovery/keyword', methods=['POST'])
def discover_by_keyword():
    """
    Discover products for a specific keyword

    Body: {
        keyword: string,
        max_products: number,  # optional, default 20
        min_score: number  # optional, default 70
    }
    """
    try:
        data = request.get_json(force=True)

        keyword = data.get('keyword')
        if not keyword:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: keyword',
                    'details': {}
                }
            }), 400

        max_products = int(data.get('max_products', 20))
        min_score = float(data.get('min_score', 70))

        logger.info(f"🔍 Discovering by keyword: {keyword}")

        discovery = get_discovery_service()
        results = discovery.discover_by_keyword(
            keyword=keyword,
            max_products=max_products,
            min_score=min_score
        )

        return jsonify({
            'ok': True,
            'data': results
        }), 200

    except Exception as e:
        logger.error(f"❌ Keyword discovery failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DISCOVERY_ERROR',
                'message': 'Failed to discover products by keyword',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/candidates', methods=['GET'])
def get_candidates():
    """
    Get list of product candidates

    Query params:
        status: filter by status
        min_score: minimum AI score
        limit: page size (default 50)
        offset: page offset (default 0)
    """
    try:
        status_filter = request.args.get('status')
        min_score = request.args.get('min_score', type=float)
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        with get_db() as db:
            # Build query
            query = db.query(ProductCandidate)

            # Apply filters
            if status_filter:
                query = query.filter(ProductCandidate.status == status_filter)

            if min_score is not None:
                query = query.filter(ProductCandidate.ai_score >= min_score)

            # Get total count
            total = query.count()

            # Sort by AI score desc and paginate
            candidates = query.order_by(desc(ProductCandidate.ai_score))\
                             .limit(limit)\
                             .offset(offset)\
                             .all()

            # Convert to dict
            candidates_data = [candidate.to_dict() for candidate in candidates]

            return jsonify({
                'ok': True,
                'data': {
                    'candidates': candidates_data,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error fetching candidates: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch candidates',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/candidates/<candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """Get single candidate by ID"""
    try:
        with get_db() as db:
            candidate = db.query(ProductCandidate).filter(
                ProductCandidate.id == candidate_id
            ).first()

            if not candidate:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'CANDIDATE_NOT_FOUND',
                        'message': f'Candidate {candidate_id} not found',
                        'details': {}
                    }
                }), 404

            return jsonify({
                'ok': True,
                'data': candidate.to_dict()
            }), 200

    except Exception as e:
        logger.error(f"❌ Error fetching candidate: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to fetch candidate',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/candidates/<candidate_id>/approve', methods=['POST'])
def approve_candidate(candidate_id):
    """
    Approve a candidate for registration

    Body: {
        reviewed_by: string
    }
    """
    try:
        data = request.get_json(force=True) or {}

        with get_db() as db:
            candidate = db.query(ProductCandidate).filter(
                ProductCandidate.id == candidate_id
            ).first()

            if not candidate:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'CANDIDATE_NOT_FOUND',
                        'message': f'Candidate {candidate_id} not found',
                        'details': {}
                    }
                }), 404

            # Update status
            candidate.status = CandidateStatus.APPROVED.value
            candidate.reviewed_by = data.get('reviewed_by', 'system')
            candidate.reviewed_at = datetime.utcnow()

            db.commit()

            logger.info(f"✅ Candidate approved: {candidate_id}")

            return jsonify({
                'ok': True,
                'data': {
                    'candidate_id': str(candidate.id),
                    'status': candidate.status,
                    'message': 'Candidate approved successfully'
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error approving candidate: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to approve candidate',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/candidates/<candidate_id>/reject', methods=['POST'])
def reject_candidate(candidate_id):
    """
    Reject a candidate

    Body: {
        reviewed_by: string,
        rejection_reason: string
    }
    """
    try:
        data = request.get_json(force=True) or {}

        with get_db() as db:
            candidate = db.query(ProductCandidate).filter(
                ProductCandidate.id == candidate_id
            ).first()

            if not candidate:
                return jsonify({
                    'ok': False,
                    'error': {
                        'code': 'CANDIDATE_NOT_FOUND',
                        'message': f'Candidate {candidate_id} not found',
                        'details': {}
                    }
                }), 404

            # Update status
            candidate.status = CandidateStatus.REJECTED.value
            candidate.reviewed_by = data.get('reviewed_by', 'system')
            candidate.reviewed_at = datetime.utcnow()
            candidate.rejection_reason = data.get('rejection_reason', '')

            db.commit()

            logger.info(f"❌ Candidate rejected: {candidate_id}")

            return jsonify({
                'ok': True,
                'data': {
                    'candidate_id': str(candidate.id),
                    'status': candidate.status,
                    'message': 'Candidate rejected'
                }
            }), 200

    except Exception as e:
        logger.error(f"❌ Error rejecting candidate: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'DATABASE_ERROR',
                'message': 'Failed to reject candidate',
                'details': {'error': str(e)}
            }
        }), 500


# ============================================================================
# Competitor Analysis - SmartStore Scraping
# ============================================================================

@bp.route('/discovery/analyze-competitor', methods=['POST'])
def analyze_competitor():
    """
    스마트스토어 경쟁사 분석 (베스트 상품 크롤링)

    Body: {
        seller_url: string,  # https://smartstore.naver.com/wg0057/best
        max_products: number,  # 최대 상품 수 (기본 100)
        min_sales: number  # 최소 판매량 (기본 1000)
    }

    Response: {
        ok: true,
        data: {
            seller_id: string,
            products: [{
                title: string,
                price: number,
                image_url: string,
                product_url: string,
                review_count: number,
                purchase_count: number,
                rating: number,
                rank: number,
                popularity_score: number
            }],
            total_count: number
        }
    }
    """
    try:
        data = request.get_json(force=True) or {}

        seller_url = data.get('seller_url')
        if not seller_url:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: seller_url',
                    'details': {}
                }
            }), 400

        max_products = int(data.get('max_products', 100))
        min_sales = int(data.get('min_sales', 1000))

        logger.info(f"🔍 Starting competitor analysis: {seller_url}")

        # Import here to avoid circular dependencies
        from connectors.smartstore_scraper import get_smartstore_scraper

        scraper = get_smartstore_scraper()
        products = scraper.scrape_best_products(
            seller_url=seller_url,
            max_products=max_products,
            min_sales=min_sales
        )

        # Extract seller ID
        import re
        seller_id_match = re.search(r'/([^/]+)/(best|products)', seller_url)
        seller_id = seller_id_match.group(1) if seller_id_match else 'unknown'

        logger.info(f"✅ Competitor analysis complete: {len(products)} products")

        return jsonify({
            'ok': True,
            'data': {
                'seller_id': seller_id,
                'products': products,
                'total_count': len(products)
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Competitor analysis failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'SCRAPING_ERROR',
                'message': 'Failed to analyze competitor',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/discovery/match-taobao-batch', methods=['POST'])
def match_taobao_batch():
    """
    스마트스토어 상품들에 대한 타오바오 배치 매칭

    Body: {
        products: [{
            title: string,
            price: number,
            image_url: string
        }],
        max_candidates: number  # 각 상품당 후보 개수 (기본 3)
    }

    Response: {
        ok: true,
        data: {
            matches: [{
                smartstore_product: {...},
                taobao_candidates: [{
                    taobao_item_id: string,
                    title: string,
                    price: number,
                    currency: 'CNY',
                    image_url: string,
                    rating: number,
                    sold_count: number,
                    similarity_score: number,
                    taobao_url: string
                }],
                best_match: {...}
            }]
        }
    }
    """
    try:
        data = request.get_json(force=True) or {}

        products = data.get('products', [])
        if not products:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: products',
                    'details': {}
                }
            }), 400

        max_candidates = int(data.get('max_candidates', 3))

        logger.info(f"🔍 Matching {len(products)} products with Taobao...")

        # Import services
        from ai.product_finder import get_product_finder
        from ai.translator import get_translator  # 한글 → 중국어 번역

        product_finder = get_product_finder()
        translator = get_translator()
        matches = []

        for idx, product in enumerate(products, 1):
            try:
                title = product.get('title', '')
                logger.info(f"   [{idx}/{len(products)}] Matching: {title[:30]}...")

                # 1. 한글 제목 → 중국어 번역
                chinese_keyword = translator.translate_korean_to_chinese(title)
                logger.info(f"      Translated: {chinese_keyword}")

                # 2. 타오바오 검색
                taobao_results = product_finder.search_products(
                    keyword=chinese_keyword,
                    max_results=max_candidates * 2  # 필터링 위해 여유있게
                )

                # 3. 가격 및 평점 기준으로 정렬
                # 평점 높은 순 → 가격 낮은 순
                sorted_results = sorted(
                    taobao_results,
                    key=lambda x: (-x.get('score', 0), x.get('price', 999999))
                )

                # 4. 상위 N개 선택
                candidates = sorted_results[:max_candidates]

                # 5. 타오바오 URL 추가
                for candidate in candidates:
                    item_id = candidate.get('taobao_item_id')
                    if item_id:
                        candidate['taobao_url'] = f"https://item.taobao.com/item.htm?id={item_id}"

                matches.append({
                    'smartstore_product': product,
                    'taobao_candidates': candidates,
                    'best_match': candidates[0] if candidates else None
                })

            except Exception as e:
                logger.warning(f"   Failed to match product: {str(e)}")
                matches.append({
                    'smartstore_product': product,
                    'taobao_candidates': [],
                    'best_match': None,
                    'error': str(e)
                })

        logger.info(f"✅ Taobao matching complete: {len(matches)} products")

        return jsonify({
            'ok': True,
            'data': {
                'matches': matches,
                'total_count': len(matches)
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Taobao matching failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'MATCHING_ERROR',
                'message': 'Failed to match with Taobao',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/discovery/calculate-prices', methods=['POST'])
def calculate_prices():
    """
    매칭된 상품들의 판매가 자동 계산

    Body: {
        matched_products: [{
            smartstore_product: {...},
            selected_taobao: {
                price: number,  # CNY
                title: string
            }
        }],
        target_margin: number  # 목표 마진율 (기본 0.35 = 35%)
    }

    Response: {
        ok: true,
        data: {
            products: [{
                ...matched_product,
                price_info: {
                    taobao_price_cny: number,
                    taobao_price_krw: number,
                    exchange_rate: number,
                    shipping_fee: number,
                    total_cost: number,
                    selling_price_rounded: number,
                    expected_profit: number,
                    actual_margin: number
                }
            }]
        }
    }
    """
    try:
        data = request.get_json(force=True) or {}

        matched_products = data.get('matched_products', [])
        if not matched_products:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: matched_products',
                    'details': {}
                }
            }), 400

        target_margin = float(data.get('target_margin', 0.35))

        logger.info(f"💰 Calculating prices for {len(matched_products)} products...")

        # Import calculator
        from utils.price_calculator import get_price_calculator

        price_calculator = get_price_calculator()
        results = []

        for product in matched_products:
            try:
                selected_taobao = product.get('selected_taobao') or product.get('best_match')
                if not selected_taobao:
                    logger.warning("   No selected taobao product, skipping...")
                    continue

                taobao_price_cny = float(selected_taobao.get('price', 0))
                title = selected_taobao.get('title', '')

                # 가격 계산
                price_info = price_calculator.calculate_selling_price(
                    taobao_price_cny=taobao_price_cny,
                    title=title,
                    target_margin=target_margin
                )

                product['price_info'] = price_info
                results.append(product)

            except Exception as e:
                logger.warning(f"   Failed to calculate price: {str(e)}")
                continue

        logger.info(f"✅ Price calculation complete: {len(results)} products")

        return jsonify({
            'ok': True,
            'data': {
                'products': results,
                'total_count': len(results)
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ Price calculation failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'CALCULATION_ERROR',
                'message': 'Failed to calculate prices',
                'details': {'error': str(e)}
            }
        }), 500


@bp.route('/discovery/export-excel', methods=['POST'])
def export_excel():
    """
    선택된 상품들을 엑셀로 내보내기

    Body: {
        products: [{
            title: string,
            price: number,  # 판매가
            images: [string],
            taobao_item_id: string,
            taobao_url: string,
            taobao_price_cny: number,
            shipping_fee: number,
            total_cost: number,
            expected_profit: number,
            actual_margin: number,
            origin: string,
            category: string
        }],
        format: 'xlsx' | 'csv'  # 기본 'xlsx'
    }

    Response:
        엑셀/CSV 파일 다운로드
    """
    try:
        data = request.get_json(force=True) or {}

        products = data.get('products', [])
        if not products:
            return jsonify({
                'ok': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing required field: products',
                    'details': {}
                }
            }), 400

        file_format = data.get('format', 'xlsx')

        logger.info(f"📊 Generating {file_format.upper()} for {len(products)} products...")

        # Import generator
        from utils.excel_generator import get_excel_generator
        from flask import send_file

        excel_generator = get_excel_generator()

        # Generate file
        if file_format == 'csv':
            filepath = excel_generator.generate_csv(products)
            mimetype = 'text/csv'
            download_name = os.path.basename(filepath)
        else:
            filepath = excel_generator.generate_excel(products)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            download_name = os.path.basename(filepath)

        logger.info(f"✅ File generated: {filepath}")

        return send_file(
            filepath,
            as_attachment=True,
            download_name=download_name,
            mimetype=mimetype
        )

    except Exception as e:
        logger.error(f"❌ Excel export failed: {str(e)}")
        return jsonify({
            'ok': False,
            'error': {
                'code': 'EXPORT_ERROR',
                'message': 'Failed to export excel',
                'details': {'error': str(e)}
            }
        }), 500
