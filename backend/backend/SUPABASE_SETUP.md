# Supabase 설정 가이드

BuyPilot을 Supabase PostgreSQL 데이터베이스에 연결하는 방법입니다.

## 1. Supabase 프로젝트 생성

### 1-1. Supabase 회원가입 및 로그인
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인

### 1-2. 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `buypilot` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 빠름)
   - **Pricing Plan**: `Free` (시작용으로 충분)
3. "Create new project" 클릭
4. 약 2분 정도 기다리면 프로젝트 생성 완료

## 2. 데이터베이스 마이그레이션 실행

### 2-1. 데이터베이스 URL 확인
1. 생성된 프로젝트 클릭
2. 좌측 메뉴에서 "Settings" → "Database" 클릭
3. "Connection string" 섹션에서 `URI` 복사
   - 형식: `postgresql://postgres.[프로젝트ID]:[비밀번호]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
   - ⚠️ `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체!

### 2-2. SQL 에디터에서 마이그레이션 실행
1. 좌측 메뉴에서 "SQL Editor" 클릭
2. "+ New query" 클릭
3. `database/migrations/001_initial_schema.sql` 파일 내용 복사/붙여넣기
4. "Run" 버튼 클릭 (또는 Ctrl/Cmd + Enter)
5. 성공 메시지 확인: "Success. No rows returned"

6. 같은 방법으로 `database/migrations/002_indexes.sql` 실행
7. 성공 메시지 확인

### 2-3. 테이블 생성 확인
1. 좌측 메뉴에서 "Table Editor" 클릭
2. 4개 테이블 확인:
   - `products` ✅
   - `orders` ✅
   - `buyer_info` ✅
   - `audit_log` ✅

## 3. Backend 환경변수 설정

### 3-1. .env 파일 생성
```bash
cd backend
cp .env.example .env
```

### 3-2. .env 파일 수정
```bash
# .env 파일을 열어서 다음 값들을 설정하세요

# Supabase Database URL (2-1에서 복사한 URL)
SUPABASE_DB_URL=postgresql://postgres.[프로젝트ID]:[비밀번호]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# JWT Secret (랜덤한 문자열로 변경)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Flask 환경
FLASK_ENV=development
FLASK_DEBUG=True
PORT=4070

# CORS (필요시 프론트엔드 URL 추가)
ALLOWED_ORIGINS=http://localhost:3000
```

⚠️ **중요**:
- `SUPABASE_DB_URL`의 `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체하세요
- `.env` 파일은 절대 Git에 커밋하지 마세요 (.gitignore에 이미 포함됨)

### 3-3. Python 의존성 설치
```bash
# backend 디렉토리에서
pip install -r requirements.txt
```

## 4. 데이터베이스 연결 테스트

### 4-1. Backend 서버 시작
```bash
cd backend
python app.py
```

### 4-2. 연결 확인
다음과 같은 로그가 나오면 성공:
```
✅ Database initialized successfully
 * Running on http://0.0.0.0:4070
```

### 4-3. API 테스트
다른 터미널에서:
```bash
# Health check
curl http://localhost:4070/health

# 주문 목록 조회 (빈 배열 반환)
curl http://localhost:4070/api/v1/orders
```

## 5. 데모 주문 생성 테스트

### 5-1. Frontend 시작
```bash
cd frontend
npm install  # 아직 안 했다면
npm run dev
```

### 5-2. 브라우저에서 테스트
1. http://localhost:3000 접속
2. "데모 생성" 버튼 클릭
3. 주문 카드가 나타나면 성공! 🎉

### 5-3. Supabase에서 데이터 확인
1. Supabase Dashboard → Table Editor
2. `orders` 테이블 클릭
3. 생성된 주문 데이터 확인
4. `buyer_info` 테이블에서 구매자 정보 확인
5. `audit_log` 테이블에서 이벤트 로그 확인

## 6. 문제 해결 (Troubleshooting)

### 연결 오류: "could not connect to server"
- Supabase 프로젝트가 활성화되어 있는지 확인
- 데이터베이스 URL이 정확한지 확인
- 비밀번호에 특수문자가 있다면 URL 인코딩 필요

### SQL 실행 오류: "type already exists"
- 이미 마이그레이션이 실행되었을 가능성
- Table Editor에서 테이블 목록 확인

### Import 오류: "No module named 'models'"
- `backend` 디렉토리에서 실행하는지 확인
- `pip install -r requirements.txt` 실행 확인

### 서버 재시작 후 데이터가 유지됨
✅ 정상입니다! 이제 PostgreSQL을 사용하므로 데이터가 영구 저장됩니다.

## 7. 다음 단계

Phase 1이 완료되었습니다! 🎉

다음 단계:
- **Phase 2**: 백그라운드 작업 시스템 (APScheduler)
- **Phase 3**: Mock API 구현
- **Phase 4**: Redis 캐시 연동
- **Phase 5**: AI 가격 비교
- **Phase 6**: 실제 공급처 API 연동

---

## 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [SQLAlchemy 문서](https://docs.sqlalchemy.org/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
