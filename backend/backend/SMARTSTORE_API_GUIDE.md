# 스마트스토어 API 연동 가이드

**Date**: 2025-10-25
**Status**: 계획 수립 단계

## 📋 개요

Selenium 크롤링 대신 **네이버 커머스 API**를 사용하여 스마트스토어 상품 정보를 가져옵니다.

### 왜 API로 전환하나요?

**Selenium 크롤링의 문제점**:
- ❌ 스마트스토어가 봇을 감지하고 차단 (에러 페이지 반환)
- ❌ HTML 구조 변경 시 크롤러 수정 필요
- ❌ 느린 속도 (Selenium + 대기 시간)
- ❌ Railway 환경에서 Chrome/Chromium 설정 복잡

**API 사용의 장점**:
- ✅ 공식 지원, 안정적
- ✅ 빠른 속도
- ✅ 구조적인 데이터
- ✅ 약관 위반 없음

---

## 🔑 네이버 커머스 API 정보

### 공식 사이트
- **API 센터**: https://apicenter.commerce.naver.com/ko/basic/commerce-api
- **기술 지원**: https://github.com/commerce-api-naver/commerce-api

### API 전환 이력
- 기존 **스마트스토어 API (SOAP)** → 2023년 11월 30일 종료
- 현재 **네이버 커머스 API (REST)** 사용

---

## 🚀 구현 단계

### 1단계: API 승인 신청 ⏳

#### 필요 조건
1. **네이버 스마트스토어 판매자 계정** (본인 계정)
2. **사업자 등록증** (일부 API 필요)
3. **서비스 소개** (BuyPilot 프로젝트)

#### 신청 절차
1. 스마트스토어 판매자 센터 로그인
2. API 센터 접속 (apicenter.commerce.naver.com)
3. "API 신청" 메뉴
4. 사용 목적 및 서비스 설명 작성
5. 승인 대기 (통상 3-7일)

### 2단계: API 키 발급 ⏳

승인 후 다음 정보를 받게 됩니다:
- **Client ID**: API 클라이언트 식별자
- **Client Secret**: API 인증 비밀키
- **Access Token**: 실제 API 호출에 사용

### 3단계: 인증 구현 (OAuth 2.0)

```python
# backend/connectors/smartstore_api.py

import requests
from typing import Dict, Any

class SmartStoreAPI:
    """네이버 커머스 API 클라이언트"""

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://api.commerce.naver.com"
        self.access_token = None

    def authenticate(self) -> bool:
        """OAuth 2.0 인증 - Access Token 발급"""
        url = f"{self.base_url}/external/v1/oauth2/token"

        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials',
            'type': 'SELF'
        }

        response = requests.post(url, data=data)

        if response.status_code == 200:
            result = response.json()
            self.access_token = result['access_token']
            return True
        else:
            return False

    def _get_headers(self) -> Dict[str, str]:
        """API 요청 헤더"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
```

### 4단계: 상품 목록 조회 API 구현

```python
def get_products(
    self,
    page: int = 1,
    size: int = 100,
    sort: str = 'SALE_COUNT'  # 판매량 순
) -> List[Dict[str, Any]]:
    """
    스마트스토어 상품 목록 조회

    Args:
        page: 페이지 번호
        size: 페이지당 상품 수 (최대 100)
        sort: 정렬 기준 (SALE_COUNT, REVIEW_COUNT, RATING, etc.)

    Returns:
        상품 목록
    """
    url = f"{self.base_url}/external/v1/products"

    params = {
        'page': page,
        'size': size,
        'sort': sort
    }

    response = requests.get(
        url,
        headers=self._get_headers(),
        params=params
    )

    if response.status_code == 200:
        result = response.json()
        return result['data']['products']
    else:
        raise Exception(f"API Error: {response.status_code}")
```

### 5단계: 베스트 상품 필터링

```python
def get_best_products(
    self,
    min_sales: int = 1000,
    max_products: int = 100
) -> List[Dict[str, Any]]:
    """
    베스트 상품 조회 (판매량 기준)

    Args:
        min_sales: 최소 판매량
        max_products: 최대 상품 수

    Returns:
        필터링된 상품 목록
    """
    all_products = []
    page = 1

    while len(all_products) < max_products:
        products = self.get_products(
            page=page,
            size=100,
            sort='SALE_COUNT'
        )

        if not products:
            break

        # 판매량 필터링
        filtered = [
            p for p in products
            if p.get('saleCount', 0) >= min_sales
        ]

        all_products.extend(filtered)

        if len(products) < 100:  # 마지막 페이지
            break

        page += 1

    # 최대 개수 제한
    return all_products[:max_products]
```

---

## 🔄 기존 코드 수정 사항

### 1. `backend/routes/discovery.py` 수정

```python
@bp.route('/discovery/analyze-competitor', methods=['POST'])
def analyze_competitor():
    """스마트스토어 베스트 상품 분석 (API 방식)"""

    data = request.get_json(force=True) or {}

    # API 방식은 seller_url 대신 seller_id 사용
    seller_id = data.get('seller_id')  # 또는 URL에서 추출
    max_products = int(data.get('max_products', 100))
    min_sales = int(data.get('min_sales', 1000))

    # Selenium 크롤러 대신 API 클라이언트 사용
    from connectors.smartstore_api import get_smartstore_api

    api = get_smartstore_api()
    products = api.get_best_products(
        min_sales=min_sales,
        max_products=max_products
    )

    return jsonify({
        'ok': True,
        'data': {
            'seller_id': seller_id,
            'total_products': len(products),
            'filtered_products': len(products),
            'products': products
        }
    })
```

### 2. 환경 변수 추가 (`.env`)

```bash
# 네이버 커머스 API
NAVER_COMMERCE_CLIENT_ID=your_client_id
NAVER_COMMERCE_CLIENT_SECRET=your_client_secret
```

### 3. Singleton 패턴 구현

```python
# backend/connectors/smartstore_api.py

_api_client = None

def get_smartstore_api() -> SmartStoreAPI:
    """SmartStore API 클라이언트 싱글톤"""
    global _api_client

    if _api_client is None:
        client_id = os.getenv('NAVER_COMMERCE_CLIENT_ID')
        client_secret = os.getenv('NAVER_COMMERCE_CLIENT_SECRET')

        if not client_id or not client_secret:
            raise Exception("API credentials not configured")

        _api_client = SmartStoreAPI(client_id, client_secret)
        _api_client.authenticate()

    return _api_client
```

---

## 📊 API vs Selenium 비교

| 항목 | Selenium 크롤링 | 네이버 커머스 API |
|------|----------------|-----------------|
| 승인 필요 | ❌ 불필요 | ✅ 필요 (3-7일) |
| 속도 | 🐢 느림 (2-3분) | ⚡ 빠름 (10-20초) |
| 안정성 | ❌ 차단 위험 | ✅ 안정적 |
| 유지보수 | ❌ HTML 변경 시 수정 | ✅ API 스펙 고정 |
| 배포 | ❌ Chrome 설정 복잡 | ✅ 간단 |
| 약관 | ⚠️ 위반 가능성 | ✅ 공식 지원 |

---

## 🎯 다음 단계

### 즉시 진행 가능
1. ✅ API 센터 접속 및 계정 확인
2. ✅ API 신청서 작성
3. ✅ 승인 대기

### 승인 후 진행
1. ⏳ API 키 발급 받기
2. ⏳ `smartstore_api.py` 구현
3. ⏳ `discovery.py` 수정
4. ⏳ 테스트 및 배포

---

## 🔧 임시 해결책 (승인 대기 중)

API 승인을 기다리는 동안 다음 방법을 사용할 수 있습니다:

### Option 1: 수동 입력 방식
- 사용자가 스마트스토어에서 상품 목록을 복사
- CSV/Excel 파일로 업로드
- 타오바오 매칭부터 시작

### Option 2: 샘플 데이터 사용
- 테스트용 샘플 데이터 제공
- 전체 플로우 테스트 가능
- 실제 데이터는 API 승인 후

---

## ❓ FAQ

### Q1: API 승인은 얼마나 걸리나요?
**A**: 통상 3-7일, 빠르면 1-2일

### Q2: 비용이 발생하나요?
**A**: 네이버 커머스 API는 **무료**입니다 (자사 몰 상품 조회)

### Q3: 다른 판매자의 상품도 조회 가능한가요?
**A**: **불가능**합니다. 본인 스마트스토어 상품만 조회 가능합니다.
→ **Phase 4의 "경쟁사 분석" 기능은 API로 구현 불가능**

### Q4: 그럼 어떻게 하나요?
**A**: 다음 대안 중 선택:
1. **자사 상품 관리**만 API 사용 (경쟁사 분석 제외)
2. **수동 입력 방식**으로 경쟁사 데이터 입력
3. **브라우저 확장 프로그램** 개발 (사용자가 직접 크롤링)

---

## 🚨 중요한 발견

### 네이버 커머스 API의 제한사항

**본인 스마트스토어 상품만 조회 가능합니다!**

즉, **경쟁사 분석 기능은 API로 구현할 수 없습니다.**

### 대안

#### Plan A: Phase 4 기능 변경 ✅ **추천**
- "경쟁사 분석" → "자사 상품 관리"로 변경
- 본인 스마트스토어 상품을 타오바오와 매칭
- 가격 최적화 및 수익 분석

#### Plan B: 하이브리드 방식
- 자사 상품: API 사용
- 경쟁사 상품: 수동 입력 (CSV/Excel 업로드)

#### Plan C: 브라우저 확장 프로그램
- Chrome Extension 개발
- 사용자가 스마트스토어 페이지에서 직접 크롤링
- 백엔드 API로 데이터 전송

---

## 💡 권장 사항

### 현실적인 구현 방안

**Phase 4 기능을 다음과 같이 수정하는 것을 권장합니다:**

1. **자사 상품 관리** (네이버 커머스 API 사용)
   - 본인 스마트스토어 상품 조회
   - 타오바오 소싱처 찾기
   - 가격 최적화

2. **경쟁사 상품 분석** (수동 입력)
   - CSV/Excel 파일 업로드
   - 또는 URL 목록 입력
   - 타오바오 매칭 및 분석

이렇게 하면:
- ✅ API 승인 후 자사 상품 자동화
- ✅ 경쟁사 분석도 가능 (수동 입력)
- ✅ 약관 위반 없음
- ✅ 안정적인 운영

---

**다음 단계**: 위 내용을 검토하고 어떤 방향으로 진행할지 결정해주세요.
