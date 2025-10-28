# 🚀 Quick Start Guide

네이버 쇼핑 분석 Chrome Extension을 5분 안에 시작하는 방법

## 📦 1단계: Extension 빌드 (이미 완료!)

```bash
cd extension
npm install  # ✅ 완료됨
npm run build  # ✅ 완료됨
```

빌드 완료! `dist/` 폴더에 Extension 파일이 생성되었습니다.

## 🔧 2단계: Extension API 서버 설정

### API 키 발급 (필수)

#### Naver Shopping API (기본 기능)
1. https://developers.naver.com/apps/#/register 접속
2. 애플리케이션 이름: `BuyPilot Extension`
3. 사용 API: **검색 (Search)** 선택
4. **Client ID**와 **Client Secret** 복사

#### Naver Search Ad API (검색량 데이터)
1. https://searchad.naver.com/ 로그인
2. 우측 상단: **도구** → **API 사용관리**
3. **네이버 검색광고 API** 신청
4. **API Key**, **Secret Key**, **Customer ID** 복사

### 환경 변수 설정

```bash
cd extension-api
cp .env.example .env
```

**`.env` 파일 편집**:
```bash
# Naver Shopping API
NAVER_CLIENT_ID=복사한_클라이언트_ID
NAVER_CLIENT_SECRET=복사한_클라이언트_시크릿

# Naver Search Ad API (선택)
NAVER_SEARCHAD_API_KEY=복사한_API_키
NAVER_SEARCHAD_SECRET=복사한_시크릿_키
NAVER_SEARCHAD_CUSTOMER_ID=복사한_고객_ID
```

### 서버 실행

```bash
cd extension-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

✅ 서버가 `http://localhost:5001`에서 실행됩니다!

테스트:
```bash
curl http://localhost:5001/health
# {"ok":true,"service":"buypilot-extension-api","status":"healthy"}
```

## 🌐 3단계: Chrome Extension 로드

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 우측 상단 **개발자 모드** 활성화
4. 좌측 상단 **압축해제된 확장 프로그램을 로드합니다** 클릭
5. `extension/dist` 폴더 선택

✅ Extension 설치 완료!

## 🎯 4단계: 테스트

1. https://search.shopping.naver.com/search/all?query=나이키 접속
2. 상품 목록 위에 **"🔍 BuyPilot 상품 분석"** 패널 표시 확인
3. 검색량, 예상 매출, 가격 분포, 경쟁 강도 확인

## 🐛 문제 해결

### 분석 패널이 안 보여요
- F12 → Console 탭에서 에러 확인
- Extension API 서버가 실행 중인지 확인
- Extension 아이콘 클릭 → "분석 패널 표시" 체크 확인

### API 연결 실패
- `.env` 파일에 API 키가 올바르게 입력되었는지 확인
- Extension 설정 (팝업)에서 "연결 테스트" 클릭
- API 서버 로그 확인: `extension-api/` 폴더에서 `tail -f` 사용

### Mock 데이터만 표시돼요
- Naver Search Ad API 키가 없으면 Mock 데이터를 사용합니다
- 실제 데이터를 보려면 Search Ad API 신청 필수

## 📚 다음 단계

- [README.md](./README.md) - 전체 기능 및 사용법
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 개발 가이드
- Chart.js 통합 (가격 분포 그래프)
- Redis 캐싱 추가
- Railway 배포

## 💡 팁

### Extension 업데이트
```bash
cd extension
npm run build
# Chrome에서 Extension 새로고침 버튼 클릭
```

### API 서버 재시작
```bash
cd extension-api
# Ctrl+C로 종료
python app.py
```

### 로그 확인
- Extension: F12 → Console
- Background: `chrome://extensions/` → Extension의 "service worker" 클릭
- API: Terminal에서 실시간 로그 표시

---

**문제가 있으신가요?** [GitHub Issues](https://github.com/Noah1206/BuyPilot/issues)에 질문해주세요!
