# 🔍 BuyPilot Shopping Analyzer Extension

네이버 쇼핑 검색 결과에 실시간 상품 분석 데이터를 표시하는 Chrome Extension입니다.

## ✨ 기능

- **검색량 분석**: 월간 검색량 (PC/모바일 구분), 트렌드
- **예상 매출액**: 검색량 기반 매출 추정, 클릭률/전환율 표시
- **가격 분포**: 상품 가격대별 분포 차트
- **경쟁 강도**: AI 기반 경쟁 강도 점수 (0-100점)

## 🚀 설치 및 실행

### 1. Extension 빌드

```bash
cd extension
npm install
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

### 2. Chrome에 Extension 로드

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension/dist` 폴더 선택

### 3. Extension API 서버 실행

```bash
cd extension-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# .env 파일 설정 (아래 참조)
cp .env.example .env
# .env 파일 편집

python app.py
```

서버는 `http://localhost:5001`에서 실행됩니다.

## ⚙️ 환경 변수 설정

### Extension API (.env)

```bash
# Naver Search Ad API (필수)
NAVER_SEARCHAD_API_KEY=your_api_key
NAVER_SEARCHAD_SECRET=your_secret_key
NAVER_SEARCHAD_CUSTOMER_ID=your_customer_id

# Naver Shopping API (필수)
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# Optional
REDIS_URL=redis://localhost:6379/0
```

### API 키 발급 방법

#### 1. Naver Search Ad API
1. [네이버 광고시스템](https://searchad.naver.com/) 로그인
2. 도구 > API 사용관리 > 네이버 검색광고 API 신청
3. API Key, Secret Key, Customer ID 발급

#### 2. Naver Shopping API
1. [Naver Developers](https://developers.naver.com/apps/#/register) 접속
2. 애플리케이션 등록
3. Search API 선택
4. Client ID, Client Secret 발급

## 📖 사용 방법

1. Extension 설치 완료 후 네이버 쇼핑 검색
2. 검색 결과 페이지에서 상품 목록 위에 분석 패널 자동 표시
3. 검색량, 매출, 가격 분포, 경쟁 강도 확인
4. 🔄 버튼으로 데이터 새로고침
5. ▼ 버튼으로 패널 최소화/확대

## 🛠️ 개발

### Extension 개발 모드

```bash
cd extension
npm run dev  # Watch mode - 파일 변경 시 자동 재빌드
```

### API 서버 개발 모드

```bash
cd extension-api
export FLASK_ENV=development
python app.py
```

### 프로젝트 구조

```
extension/
├── manifest.json          # Extension manifest v3
├── src/
│   ├── content/          # Content script (페이지 주입)
│   ├── background/       # Service worker
│   ├── popup/            # Extension popup (설정)
│   └── styles/           # CSS 스타일
└── dist/                 # 빌드 결과물

extension-api/
├── app.py                # Flask 서버
├── routes/              # API 라우트
│   └── analytics.py     # 분석 엔드포인트
└── services/            # 외부 API 통합
    ├── naver_search_ad_api.py
    ├── naver_shopping_api.py
    └── revenue_estimator.py
```

## 🔧 기술 스택

### Extension
- TypeScript
- Webpack
- Chart.js (가격 분포 그래프)
- Chrome Extension Manifest V3

### API Server
- Python 3.11+
- Flask
- Requests (Naver API 통합)
- Redis (캐싱)

## 📝 라이센스

MIT License

## 👥 Contributors

BuyPilot Team
