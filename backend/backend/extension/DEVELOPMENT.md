# 🔧 Development Guide

## 다음 단계 (Phase 1-4 완료)

### ✅ 완료된 작업
- [x] Extension 기본 구조 (Manifest V3)
- [x] Content Script (네이버 쇼핑 페이지 감지)
- [x] Analyzer UI Panel (4개 카드)
- [x] Backend API 서버
- [x] Naver Search Ad API 통합
- [x] Naver Shopping API 통합
- [x] 매출 추정 알고리즘
- [x] 경쟁 강도 분석 알고리즘

### 🚧 진행할 작업

#### 1. Chart.js 통합 (가격 분포 그래프)

**파일**: `extension/src/content/content.ts`

`renderPriceChart()` 함수에 Chart.js 구현:

```typescript
import Chart from 'chart.js/auto';

function renderPriceChart(distribution: { ranges: string[]; counts: number[] }): void {
  const canvas = document.getElementById('price-distribution-chart') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: distribution.ranges,
      datasets: [{
        label: '상품 수',
        data: distribution.counts,
        backgroundColor: 'rgba(102, 126, 234, 0.7)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}
```

#### 2. 네이버 API 키 설정

**필수**: Extension API가 작동하려면 API 키가 필요합니다.

**`.env` 파일 생성**:
```bash
cd extension-api
cp .env.example .env
```

**API 키 발급**:
1. **Naver Search Ad API**: https://searchad.naver.com/ → 도구 → API 사용관리
2. **Naver Shopping API**: https://developers.naver.com/apps/#/register

#### 3. Redis 캐싱 구현

API 호출을 줄이기 위한 캐싱 시스템:

**파일**: `extension-api/services/cache.py`

```python
import redis
import json
from typing import Optional, Any

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)
        self.ttl = 300  # 5 minutes

    def get(self, key: str) -> Optional[Any]:
        data = self.redis.get(key)
        return json.loads(data) if data else None

    def set(self, key: str, value: Any, ttl: int = None):
        self.redis.setex(
            key,
            ttl or self.ttl,
            json.dumps(value)
        )
```

#### 4. 에러 핸들링 개선

- Extension에 Toast 알림 추가
- API 요청 실패 시 재시도 로직
- Fallback 데이터 표시

#### 5. 성능 최적화

- API 응답 캐싱 (Redis)
- 중복 요청 방지 (Request deduplication)
- 페이지 로딩 시간 최소화

#### 6. UI/UX 개선

- 로딩 애니메이션 개선
- 툴팁 추가 (각 지표 설명)
- 다크 모드 지원
- 모바일 반응형 (네이버 쇼핑 모바일 지원)

#### 7. 추가 기능

- 월별 트렌드 그래프 (확장 가능)
- 키워드 비교 기능
- 즐겨찾기/북마크 기능
- 데이터 내보내기 (CSV/Excel)

## 테스트 방법

### 1. API 서버 테스트

```bash
# Health check
curl http://localhost:5001/health

# Analysis endpoint (mock data 사용)
curl -X POST http://localhost:5001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"keyword":"나이키"}'
```

### 2. Extension 테스트

1. Chrome에서 Extension 로드
2. https://search.shopping.naver.com/search/all?query=나이키 접속
3. 상품 목록 위에 분석 패널 표시 확인
4. 개발자 도구 콘솔에서 로그 확인

### 3. 디버깅

**Extension Console**:
- 우클릭 → 검사 → Console 탭

**Background Service Worker**:
- `chrome://extensions/` → Extension의 "service worker" 링크 클릭

**API Server Logs**:
```bash
cd extension-api
tail -f app.log
```

## 배포

### Extension 배포 (Chrome Web Store)

1. Extension 빌드
```bash
npm run build
cd dist && zip -r ../extension.zip *
```

2. Chrome Web Store Developer Dashboard 접속
3. 새 항목 업로드
4. extension.zip 업로드
5. 스토어 리스팅 작성

### API 서버 배포 (Railway)

1. Railway CLI 설치
```bash
npm install -g @railway/cli
```

2. 프로젝트 생성 및 배포
```bash
cd extension-api
railway login
railway init
railway up
```

3. 환경 변수 설정
```bash
railway variables set NAVER_CLIENT_ID=...
railway variables set NAVER_CLIENT_SECRET=...
# 나머지 환경 변수들도 설정
```

## 문제 해결

### Extension이 로드되지 않음
- Manifest 구문 오류 확인
- 권한 설정 확인
- 빌드 재실행

### 분석 패널이 표시되지 않음
- 네이버 쇼핑 검색 결과 페이지인지 확인
- 콘솔에서 에러 로그 확인
- Content Script 주입 확인

### API 호출 실패
- API 서버가 실행 중인지 확인
- 환경 변수 설정 확인
- CORS 설정 확인

## 참고 자료

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Naver Search Ad API](https://naver.github.io/searchad-apidoc/)
- [Naver Developers](https://developers.naver.com/docs/search/shopping/)
- [Chart.js Docs](https://www.chartjs.org/docs/latest/)
