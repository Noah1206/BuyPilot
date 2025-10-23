# Railway PostgreSQL 설정 가이드

## 1. Railway 프로젝트 생성

### Railway 계정 생성 및 로그인
1. [Railway.app](https://railway.app) 접속
2. GitHub 계정으로 로그인
3. 무료 플랜: $5 크레딧/월 제공 (충분함)

### 새 프로젝트 생성
1. Dashboard → "New Project" 클릭
2. "Deploy PostgreSQL" 선택
3. 자동으로 PostgreSQL 인스턴스 생성됨

## 2. PostgreSQL 연결 정보 확인

### 연결 문자열 복사
1. PostgreSQL 서비스 클릭
2. "Variables" 탭 선택
3. `DATABASE_URL` 복사

예시:
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

### 연결 정보 구조
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

## 3. .env 파일 업데이트

`backend/.env` 파일 수정:

```bash
# Railway PostgreSQL
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@containers-us-west-XXX.railway.app:5432/railway
```

**주의**: Railway에서 복사한 `DATABASE_URL`을 그대로 `SUPABASE_DB_URL`에 붙여넣으세요.

## 4. 데이터베이스 마이그레이션 실행

### PostgreSQL 클라이언트 설치 (psql)

**macOS:**
```bash
brew install postgresql@14
```

**설치 확인:**
```bash
psql --version
```

### 마이그레이션 실행

Railway DATABASE_URL을 환경변수로 설정:
```bash
export DATABASE_URL="postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway"
```

또는 직접 실행:
```bash
# 1. 기본 스키마
psql "postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway" \
  -f database/migrations/001_initial_schema.sql

# 2. 타오바오 필드 추가
psql "postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway" \
  -f database/migrations/002_add_taobao_fields.sql

# 3. 백그라운드 작업
psql "postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway" \
  -f database/migrations/003_background_jobs.sql

# 4. AI 상품 후보 (신규)
psql "postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway" \
  -f database/migrations/004_product_candidates.sql
```

### 마이그레이션 확인

Railway Dashboard에서:
1. PostgreSQL 서비스 → "Data" 탭
2. 테이블 목록 확인:
   - `users`
   - `products`
   - `orders`
   - `background_jobs`
   - `product_candidates` ✨ (신규)

## 5. Railway에 Flask 백엔드 배포 (선택사항)

### 프로젝트에 백엔드 서비스 추가
1. 같은 Railway 프로젝트에서 "New Service" 클릭
2. "GitHub Repo" 선택 → BuyPilot 레포지토리 선택
3. Root Directory: `/backend` 설정

### 환경변수 설정
Railway 백엔드 서비스 → Variables 탭:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # PostgreSQL과 자동 연결
OPENAI_API_KEY=sk-...
JWT_SECRET=your-jwt-secret
FLASK_ENV=production
```

### 자동 배포
- GitHub에 push하면 자동으로 배포됨
- Railway가 Flask 앱 자동 감지 및 실행

## 6. 로컬 개발 환경 설정

### .env 파일 최종 확인
```bash
# Railway PostgreSQL
SUPABASE_DB_URL=postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway

# OpenAI API (이미 설정됨)
OPENAI_API_KEY=sk-svcacct-...

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Flask Environment
FLASK_ENV=development
FLASK_DEBUG=True
```

### 서버 실행
```bash
cd backend
python app.py
```

서버 시작: `http://localhost:5000`

## 7. AI 자동 발견 테스트

### API 테스트
```bash
# AI 자동 발견 시작
curl -X POST http://localhost:5000/api/v1/discovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "category": "fashion",
    "keyword_count": 3,
    "products_per_keyword": 5,
    "min_score": 70
  }'

# 후보 상품 목록 조회
curl http://localhost:5000/api/v1/candidates?status=scored&min_score=70

# 특정 후보 상품 상세 조회
curl http://localhost:5000/api/v1/candidates/{candidate_id}

# 후보 상품 승인
curl -X POST http://localhost:5000/api/v1/candidates/{candidate_id}/approve \
  -H "Content-Type: application/json" \
  -d '{"reviewed_by": "admin"}'
```

## Railway vs Supabase 비교

| 기능 | Railway | Supabase |
|------|---------|----------|
| 데이터베이스 | PostgreSQL | PostgreSQL |
| 무료 티어 | $5 크레딧/월 | 500MB DB 무료 |
| 백엔드 배포 | ✅ 통합 가능 | ❌ 별도 호스팅 필요 |
| 자동 백업 | ✅ | ✅ |
| SQL 에디터 | ✅ | ✅ |
| 설정 복잡도 | 쉬움 | 쉬움 |

## 비용 예상 (Railway)

### 무료 플랜
- $5 크레딧/월 무료
- PostgreSQL: ~$2-3/월
- Flask 백엔드: ~$2-3/월
- **합계: 무료 크레딧으로 충분**

### 유료 플랜 (성장 시)
- Hobby Plan: $5/월
- PostgreSQL: ~$5-10/월
- Flask 백엔드: ~$5-10/월
- **합계: ~$15-25/월**

## 문제 해결

### psql 연결 실패
```bash
# SSL 모드 추가
psql "postgresql://...?sslmode=require" -f migration.sql
```

### 마이그레이션 실패
- Railway Dashboard → PostgreSQL → Data 탭에서 직접 SQL 실행 가능
- SQL 복사해서 붙여넣기

### 연결 타임아웃
- Railway는 외부 IP에서 연결 가능하도록 자동 설정됨
- 방화벽 설정 불필요

## 다음 단계

1. ✅ Railway PostgreSQL 생성
2. ✅ 연결 정보 복사 → .env 업데이트
3. ✅ psql 설치
4. 📋 마이그레이션 실행
5. 📋 Flask 서버 실행
6. 📋 AI 자동 발견 API 테스트
7. 📋 (선택) Railway에 백엔드 배포
