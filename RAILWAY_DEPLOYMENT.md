# Railway Deployment Guide - BuyPilot

Railway에 BuyPilot을 배포하는 방법입니다.

## 필수 환경 변수 (Railway)

Railway 프로젝트 → Variables 탭에서 다음 환경 변수들을 설정하세요:

### 1. Database (PostgreSQL)
Railway에서 PostgreSQL 서비스를 추가하면 자동으로 설정됩니다:
- `DATABASE_URL` - 자동 설정됨
- `PGHOST` - 자동 설정됨
- `PGPORT` - 자동 설정됨
- `PGUSER` - 자동 설정됨
- `PGPASSWORD` - 자동 설정됨
- `PGDATABASE` - 자동 설정됨

### 2. OpenAI (필수) - HeySeller 번역 기능
```
OPENAI_API_KEY=sk-proj-...
```
- 타오바오 상품 중국어 → 한국어 자동 번역에 사용
- https://platform.openai.com/api-keys 에서 발급

### 3. JWT (보안)
```
JWT_SECRET=your-random-secret-key-here
```
- 32자 이상의 랜덤 문자열 추천
- 생성 방법: `openssl rand -hex 32`

### 4. CORS (프론트엔드 접근)
```
ALLOWED_ORIGINS=https://your-railway-app.railway.app
```
- Railway 배포 후 자동 생성되는 도메인 입력
- 여러 도메인: 쉼표로 구분 (`domain1.com,domain2.com`)

### 5. Flask (선택사항)
```
FLASK_DEBUG=False
PORT=8080
```
- Railway는 PORT를 자동으로 설정하므로 생략 가능

## HeySeller 기능 동작 확인

배포 후 다음을 확인하세요:

### 1. Chrome이 제대로 설치되었는지 확인
```bash
# Railway 로그에서 확인:
# "Chrome WebDriver initialized" 메시지가 나와야 함
```

### 2. 이미지 다운로드 테스트
```bash
curl -X POST https://your-app.railway.app/api/v1/products/import \
  -H "Content-Type: application/json" \
  -d '{"url":"https://item.taobao.com/item.htm?id=YOUR_PRODUCT_ID"}'
```

성공 시 응답:
```json
{
  "ok": true,
  "data": {
    "message": "Product imported successfully (HeySeller Mode)",
    "features": {
      "scraped": true,
      "translated": true,
      "images_downloaded": 5
    }
  }
}
```

## 문제 해결

### Chrome 관련 오류
```
ERROR: Chrome not found
```
**해결**: Dockerfile이 최신 버전인지 확인 (Chrome 설치 포함)

### 번역 실패
```
WARNING: OPENAI_API_KEY not configured
```
**해결**: Railway Variables에 `OPENAI_API_KEY` 추가

### 이미지 다운로드 실패
```
ERROR: Permission denied: storage/images
```
**해결**: Dockerfile에서 `mkdir -p /app/backend/storage/images` 확인

### 메모리 부족
```
Selenium crashed with memory error
```
**해결**: Railway 플랜 업그레이드 또는 이미지 최적화 설정 조정

## Railway 배포 명령어

### 1. Git Push로 자동 배포
```bash
git add .
git commit -m "Deploy HeySeller features to Railway"
git push origin main
```

Railway가 자동으로 빌드하고 배포합니다.

### 2. Railway CLI로 배포 (선택)
```bash
railway login
railway link
railway up
```

## 배포 후 체크리스트

- [ ] PostgreSQL 서비스 추가됨
- [ ] OPENAI_API_KEY 환경 변수 설정됨
- [ ] JWT_SECRET 환경 변수 설정됨
- [ ] ALLOWED_ORIGINS 환경 변수 설정됨
- [ ] 빌드 성공 (로그 확인)
- [ ] Chrome 설치 확인 (로그에서 "Chrome" 검색)
- [ ] Health check 성공: `curl https://your-app.railway.app/health`
- [ ] 상품 가져오기 테스트 성공
- [ ] 프론트엔드 접속 가능: `https://your-app.railway.app`

## 성능 최적화

### 이미지 다운로드 제한
`backend/routes/products.py:117` 에서 수정:
```python
max_images=5  # 기본값: 5개
max_images=3  # 메모리 절약: 3개로 줄임
```

### Headless Chrome 메모리 최적화
`backend/connectors/taobao_scraper.py:46` 에서 추가:
```python
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--memory-pressure-off')
```

## 비용 최적화

- **Hobby Plan (무료)**: 월 512MB RAM, 1GB 디스크
  - 하루 10-20개 상품 파싱 가능
  - 동시 사용자 2-3명

- **Starter Plan ($5/월)**: 월 8GB RAM, 100GB 디스크
  - 하루 100+ 상품 파싱 가능
  - 동시 사용자 10명+

## 지원

문제가 발생하면 Railway 로그를 확인하세요:
```bash
railway logs
```

또는 GitHub Issues에 올려주세요.
