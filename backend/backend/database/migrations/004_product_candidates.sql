-- Migration: Add product_candidates table for AI-discovered products
-- Description: Products discovered by AI that are pending approval for registration

CREATE TYPE candidate_status AS ENUM (
    'discovered',        -- AI가 발견함
    'scored',           -- AI 스코어링 완료
    'optimized',        -- AI 최적화 완료
    'pending_approval', -- 사용자 승인 대기
    'approved',         -- 승인됨
    'rejected',         -- 거절됨
    'registered'        -- 스마트스토어 등록 완료
);

CREATE TABLE product_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status candidate_status NOT NULL DEFAULT 'discovered',

    -- 원본 타오바오 데이터
    source VARCHAR(50) NOT NULL DEFAULT 'taobao',
    source_url TEXT NOT NULL,
    source_item_id VARCHAR(255) NOT NULL,
    original_title TEXT NOT NULL,
    original_price NUMERIC(12, 2),
    original_currency VARCHAR(10) DEFAULT 'CNY',
    original_images JSONB DEFAULT '[]',
    original_data JSONB DEFAULT '{}',

    -- AI 스코어링 결과
    ai_score NUMERIC(5, 2), -- 0-100
    score_breakdown JSONB DEFAULT '{}', -- {sales_prediction, price_competitiveness, review_quality, image_quality}

    -- 키워드 분석
    discovery_keyword VARCHAR(255), -- 발견하게 된 키워드
    keywords JSONB DEFAULT '[]', -- 관련 키워드들
    trend_score NUMERIC(5, 2), -- 트렌드 점수
    search_volume INTEGER, -- 월간 검색량

    -- AI 최적화 결과
    optimized_title TEXT,
    optimized_description TEXT,
    optimized_images JSONB DEFAULT '[]',
    suggested_price NUMERIC(12, 2), -- KRW
    suggested_cost NUMERIC(12, 2), -- 원가 + 배송비
    suggested_margin NUMERIC(12, 2), -- 마진

    -- 카테고리 매핑
    suggested_category VARCHAR(255),
    naver_category_id VARCHAR(100),

    -- 승인 정보
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- 등록 정보
    registered_platform VARCHAR(50), -- smartstore, coupang, etc
    registered_product_id VARCHAR(255),
    registered_at TIMESTAMP WITH TIME ZONE,

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 인덱스
    CONSTRAINT unique_source_item UNIQUE(source, source_item_id)
);

-- 인덱스 생성
CREATE INDEX idx_product_candidates_status ON product_candidates(status);
CREATE INDEX idx_product_candidates_ai_score ON product_candidates(ai_score DESC);
CREATE INDEX idx_product_candidates_discovery_keyword ON product_candidates(discovery_keyword);
CREATE INDEX idx_product_candidates_created_at ON product_candidates(created_at DESC);

-- Updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_product_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_candidates_updated_at
    BEFORE UPDATE ON product_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_product_candidates_updated_at();

-- 코멘트
COMMENT ON TABLE product_candidates IS 'AI가 발견하고 최적화한 상품 후보들';
COMMENT ON COLUMN product_candidates.ai_score IS 'AI 종합 점수 (0-100)';
COMMENT ON COLUMN product_candidates.discovery_keyword IS '이 상품을 발견하게 된 키워드';
COMMENT ON COLUMN product_candidates.suggested_price IS '제안 판매가 (KRW)';
COMMENT ON COLUMN product_candidates.suggested_margin IS '예상 마진 (KRW)';
