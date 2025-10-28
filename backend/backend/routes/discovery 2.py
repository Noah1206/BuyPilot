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
