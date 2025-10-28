"""
Product Candidate model - AI-discovered products pending approval
"""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from models.db import Base


class CandidateStatus(str, enum.Enum):
    """Product candidate status"""
    DISCOVERED = 'discovered'          # AI가 발견함
    SCORED = 'scored'                 # AI 스코어링 완료
    OPTIMIZED = 'optimized'           # AI 최적화 완료
    PENDING_APPROVAL = 'pending_approval'  # 사용자 승인 대기
    APPROVED = 'approved'             # 승인됨
    REJECTED = 'rejected'             # 거절됨
    REGISTERED = 'registered'         # 스마트스토어 등록 완료


class ProductCandidate(Base):
    """Product candidate table model"""
    __tablename__ = 'product_candidates'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String, nullable=False, default=CandidateStatus.DISCOVERED.value)

    # 원본 타오바오 데이터
    source = Column(String, nullable=False, default='taobao')
    source_url = Column(Text, nullable=False)
    source_item_id = Column(String, nullable=False)
    original_title = Column(Text, nullable=False)
    original_price = Column(Numeric(12, 2))
    original_currency = Column(String, default='CNY')
    original_images = Column(JSONB, default=[])
    original_data = Column(JSONB, default={})

    # AI 스코어링 결과
    ai_score = Column(Numeric(5, 2))  # 0-100
    score_breakdown = Column(JSONB, default={})

    # 키워드 분석
    discovery_keyword = Column(String)
    keywords = Column(JSONB, default=[])
    trend_score = Column(Numeric(5, 2))
    search_volume = Column(Integer)

    # AI 최적화 결과
    optimized_title = Column(Text)
    optimized_description = Column(Text)
    optimized_images = Column(JSONB, default=[])
    suggested_price = Column(Numeric(12, 2))  # KRW
    suggested_cost = Column(Numeric(12, 2))
    suggested_margin = Column(Numeric(12, 2))

    # 카테고리 매핑
    suggested_category = Column(String)
    naver_category_id = Column(String)

    # 승인 정보
    reviewed_by = Column(String)
    reviewed_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)

    # 등록 정보
    registered_platform = Column(String)
    registered_product_id = Column(String)
    registered_at = Column(DateTime(timezone=True))

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'status': self.status,

            # 원본 데이터
            'source': self.source,
            'source_url': self.source_url,
            'source_item_id': self.source_item_id,
            'original_title': self.original_title,
            'original_price': float(self.original_price) if self.original_price else None,
            'original_currency': self.original_currency,
            'original_images': self.original_images or [],

            # AI 스코어
            'ai_score': float(self.ai_score) if self.ai_score else None,
            'score_breakdown': self.score_breakdown or {},

            # 키워드
            'discovery_keyword': self.discovery_keyword,
            'keywords': self.keywords or [],
            'trend_score': float(self.trend_score) if self.trend_score else None,
            'search_volume': self.search_volume,

            # 최적화 결과
            'optimized_title': self.optimized_title,
            'optimized_description': self.optimized_description,
            'optimized_images': self.optimized_images or [],
            'suggested_price': float(self.suggested_price) if self.suggested_price else None,
            'suggested_cost': float(self.suggested_cost) if self.suggested_cost else None,
            'suggested_margin': float(self.suggested_margin) if self.suggested_margin else None,

            # 카테고리
            'suggested_category': self.suggested_category,
            'naver_category_id': self.naver_category_id,

            # 승인 정보
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'rejection_reason': self.rejection_reason,

            # 등록 정보
            'registered_platform': self.registered_platform,
            'registered_product_id': self.registered_product_id,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,

            # 타임스탬프
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
