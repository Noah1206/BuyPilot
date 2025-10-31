# 🔄 하이브리드 배포 가이드 (Railway + AWS EC2)

BuyPilot의 하이브리드 아키텍처: Railway를 메인 서버로 사용하고, 네이버 Commerce API만 AWS EC2를 통해 호출합니다.

## 📊 아키텍처 개요

```
사용자
  ↓
Railway (https://buypilot-production.up.railway.app)
  ├─→ 일반 기능: 로그인, 상품 관리, 이미지 처리
  │   └─→ Railway PostgreSQL
  │
  └─→ 네이버 상품 등록 (/api/v1/smartstore/register-products)
      └─→ AWS EC2 (http://98.94.199.189:8080)
          └─→ Naver Commerce API (Elastic IP 화이트리스트)
```

## 🎯 왜 하이브리드 방식인가?

### 문제
네이버 Commerce API는 IP 화이트리스트가 필요하지만, Railway는 동적 IP를 사용합니다.

### 해결책
- **Railway**: 메인 서버 (HTTPS, 자동 배포, 깔끔한 도메인)
- **AWS EC2**: 네이버 API 전용 (Elastic IP `98.94.199.189`)

### 장점
✅ Railway의 편리함 유지 (자동 배포, HTTPS, 도메인)
✅ 네이버 API 화이트리스트 문제 해결
✅ 전체 앱을 AWS로 마이그레이션할 필요 없음
✅ 비용 효율적 (필요한 경우에만 AWS 사용)

## ⚙️ Railway 설정

### 1. 환경 변수 추가

Railway 대시보드 → **BuyPilot 프로젝트** → **Variables** → **+ New Variable**

```bash
# AWS EC2 프록시 활성화
USE_AWS_PROXY=true

# AWS EC2 엔드포인트
AWS_EC2_ENDPOINT=http://98.94.199.189:8080
```

### 2. 기존 환경 변수 유지

```bash
# Railway PostgreSQL (기존)
DATABASE_URL=postgresql://postgres:VzzMsPCOoYIMABwfSMzxfvKeJIfQzGSp@crossover.proxy.rlwy.net:59766/railway

# Naver Commerce API (기존)
NAVER_COMMERCE_CLIENT_ID=5hFeoCcp4vMIr3i3uxciB2
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$6rIRS1Vadkk69UlEfByIy.

# CORS (기존)
ALLOWED_ORIGINS=https://buypilot-production.up.railway.app,http://localhost:3000

# Flask (기존)
FLASK_ENV=production
FLASK_DEBUG=False
PORT=8080
```

### 3. 배포 확인

Railway는 코드 푸시 시 자동으로 재배포됩니다. 약 3-5분 후 확인:

```bash
# Railway health check
curl https://buypilot-production.up.railway.app/health
```

## 🖥️ AWS EC2 설정

### 1. EC2 인스턴스 정보

- **인스턴스 타입**: t3.small (Amazon Linux)
- **Elastic IP**: `98.94.199.189`
- **Security Group**: `buypilot-sg`
  - SSH (22): `0.0.0.0/0`
  - HTTP (8080): `0.0.0.0/0`

### 2. SSH 접속

```bash
# Browser-based SSH (추천)
AWS Console → EC2 → Instances → buypilot-instance → Connect → EC2 Instance Connect

# 또는 SSH 키로 접속 (키 경로 확인 필요)
ssh -i ~/.ssh/buypilot-key.pem ec2-user@98.94.199.189
```

### 3. 코드 업데이트

EC2에 SSH 접속 후:

```bash
cd BuyPilot

# 최신 코드 가져오기
git pull origin main

# Docker 이미지 재빌드
docker build -t buypilot-app .

# 기존 컨테이너 중지 및 제거
docker stop buypilot-app
docker rm buypilot-app

# 새 컨테이너 실행
docker run -d \
  --name buypilot-app \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  -v $(pwd)/backend/storage:/app/backend/storage \
  buypilot-app

# 로그 확인
docker logs -f buypilot-app
```

### 4. AWS EC2 환경 변수 (.env)

```bash
# Railway PostgreSQL (External URL)
DATABASE_URL=postgresql://postgres:VzzMsPCOoYIMABwfSMzxfvKeJIfQzGSp@crossover.proxy.rlwy.net:59766/railway

# Naver Commerce API
NAVER_COMMERCE_CLIENT_ID=5hFeoCcp4vMIr3i3uxciB2
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$6rIRS1Vadkk69UlEfByIy.

# CORS
ALLOWED_ORIGINS=http://98.94.199.189:8080,http://localhost:3000

# Flask
FLASK_ENV=production
FLASK_DEBUG=False
PORT=8080

# AWS EC2 - 프록시 비활성화 (직접 처리)
USE_AWS_PROXY=false
```

## 🧪 테스트

### 1. Railway 일반 API 테스트

```bash
# Health check
curl https://buypilot-production.up.railway.app/health

# Products API
curl https://buypilot-production.up.railway.app/api/v1/products
```

### 2. AWS EC2 직접 테스트

```bash
# Health check
curl http://98.94.199.189:8080/health

# SmartStore registration (직접)
curl -X POST http://98.94.199.189:8080/api/v1/smartstore/register-products \
  -H "Content-Type: application/json" \
  -d '{"product_ids":["test-001"]}'
```

### 3. Railway → AWS EC2 프록시 테스트 (실제 사용)

```bash
# Railway를 통해 AWS EC2로 프록시
curl -X POST https://buypilot-production.up.railway.app/api/v1/smartstore/register-products \
  -H "Content-Type: application/json" \
  -d '{"product_ids":["test-001"]}'
```

## 📋 데이터 흐름

### 네이버 상품 등록 시나리오

1. **사용자**: Railway 프론트엔드에서 "네이버 등록" 버튼 클릭
   ```
   POST https://buypilot-production.up.railway.app/api/v1/smartstore/register-products
   ```

2. **Railway 백엔드**: 프록시 모드 확인 (`USE_AWS_PROXY=true`)
   ```python
   if use_aws_proxy:
       # AWS EC2로 전달
       aws_response = requests.post(
           "http://98.94.199.189:8080/api/v1/smartstore/register-products",
           json=request.get_json()
       )
   ```

3. **AWS EC2 백엔드**: Railway PostgreSQL에서 상품 정보 조회
   ```python
   # Railway DB 연결
   DATABASE_URL=postgresql://...@crossover.proxy.rlwy.net:59766/railway
   ```

4. **AWS EC2**: Naver Commerce API 호출 (Elastic IP로)
   ```python
   # Elastic IP: 98.94.199.189
   naver_api.register_product(product_data)
   ```

5. **AWS EC2**: 결과를 Railway로 반환

6. **Railway**: 사용자에게 최종 응답

## 🔧 트러블슈팅

### Railway에서 AWS EC2 연결 안 됨

**증상**: `PROXY_ERROR` 또는 `PROXY_TIMEOUT`

**해결책**:
1. AWS EC2 Security Group에서 포트 8080이 열려있는지 확인
2. AWS EC2 Docker 컨테이너가 실행 중인지 확인
   ```bash
   docker ps
   docker logs buypilot-app
   ```

### AWS EC2에서 Railway PostgreSQL 연결 안 됨

**증상**: `Could not connect to server`

**해결책**:
1. AWS EC2 `.env` 파일에서 `DATABASE_URL` 확인 (외부 URL 사용)
2. Railway PostgreSQL이 외부 접속을 허용하는지 확인

### 네이버 API IP_NOT_ALLOWED 에러

**증상**: `{"code":"GW.IP_NOT_ALLOWED"}`

**해결책**:
1. 네이버 Commerce API 설정에서 Elastic IP `98.94.199.189` 등록 확인
2. 5-10분 대기 (IP 화이트리스트 반영 시간)

## 💰 비용

| 항목 | 예상 비용 |
|------|-----------|
| Railway Pro | $20/month |
| AWS EC2 t3.small | $15-20/month |
| AWS Elastic IP | 무료 (인스턴스에 연결 시) |
| **총 예상 비용** | **$35-40/month** |

## 🚀 프로덕션 체크리스트

- [ ] Railway 환경 변수 `USE_AWS_PROXY=true` 설정
- [ ] AWS EC2 환경 변수 `USE_AWS_PROXY=false` 설정
- [ ] 네이버 API에 Elastic IP `98.94.199.189` 등록
- [ ] Railway → AWS EC2 프록시 테스트 성공
- [ ] AWS EC2 → Naver API 직접 호출 테스트 성공
- [ ] Railway PostgreSQL 연결 확인 (두 서버 모두)
- [ ] Docker 컨테이너 재시작 정책 설정 (`--restart unless-stopped`)

## 📞 접속 링크

### 사용자 접속 (프론트엔드)
```
👉 https://buypilot-production.up.railway.app
```

### 개발자 접속
- **Railway 백엔드**: `https://buypilot-production.up.railway.app`
- **AWS EC2 백엔드**: `http://98.94.199.189:8080` (내부 전용)
