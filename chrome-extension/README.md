# BuyPilot Chrome Extension

Taobao 상품을 브라우저에서 직접 BuyPilot으로 가져오는 Chrome Extension입니다.

## 기능

- ✅ Taobao/Tmall 상품 페이지에서 직접 데이터 추출
- ✅ 원클릭 상품 임포트
- ✅ API 제한 없음 (직접 페이지에서 추출)
- ✅ 로그인 상태에서 작동하므로 봇 감지 우회
- ✅ 실시간 상품 프리뷰

## 설치 방법

### 1. Chrome Extension 로드

1. Chrome 브라우저 열기
2. 주소창에 입력: `chrome://extensions/`
3. 우측 상단 "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 이 폴더 선택: `/Users/johyeon-ung/Desktop/BuyPilot/chrome-extension`

### 2. 아이콘 생성 (필요시)

현재 아이콘이 없으므로, 임시로 생성하거나 나중에 추가할 수 있습니다:

```bash
# 임시 아이콘 생성 (macOS)
cd /Users/johyeon-ung/Desktop/BuyPilot/chrome-extension/icons

# 간단한 PNG 생성 (ImageMagick 필요)
convert -size 128x128 xc:purple -pointsize 60 -fill white -gravity center \
  -annotate +0+0 "BP" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

또는 온라인에서 아이콘 생성:
- https://www.canva.com (무료)
- 128x128, 48x48, 32x32, 16x16 크기로 저장

## 사용 방법

### 1. Taobao 상품 페이지 방문

예: https://item.taobao.com/item.htm?id=681298346857

### 2. Extension 아이콘 클릭

브라우저 우측 상단의 BuyPilot 아이콘 클릭

### 3. 상품 가져오기

- 자동으로 상품 정보가 추출됨
- "상품 가져오기" 버튼 클릭
- BuyPilot 대시보드로 자동 전송

## 설정

### 백엔드 URL 변경

- 기본값: `https://buypilot.railway.app`
- 로컬 테스트: `http://localhost:8080`

Popup에서 백엔드 URL을 변경할 수 있습니다.

## 기술 스택

- **Manifest V3**: 최신 Chrome Extension API
- **Content Script**: Taobao 페이지에서 데이터 추출
- **Popup UI**: 사용자 인터페이스
- **Background Service Worker**: 백그라운드 작업

## 파일 구조

```
chrome-extension/
├── manifest.json          # Extension 설정
├── content.js            # 페이지 데이터 추출 스크립트
├── popup.html            # Popup UI
├── popup.js              # Popup 로직
├── background.js         # Background worker
├── icons/                # 아이콘 파일들
└── README.md            # 이 파일
```

## 데이터 추출 로직

Extension은 Taobao 페이지에서 다음 정보를 추출합니다:

1. **기본 정보**
   - 제품 ID (URL에서)
   - 제목 (title)
   - 가격 (price)
   - 판매자 (seller)

2. **이미지**
   - 썸네일 이미지
   - 상세 이미지
   - 옵션 이미지

3. **옵션/SKU**
   - 색상, 사이즈 등 선택 옵션
   - 각 옵션의 값과 이미지

4. **상세 정보**
   - 제품 스펙
   - 속성 정보

## 트러블슈팅

### Extension이 로드되지 않을 때

1. Chrome 버전 확인 (최신 버전 권장)
2. 개발자 모드가 활성화되어 있는지 확인
3. manifest.json 오류 확인

### 상품 정보가 추출되지 않을 때

1. Taobao/Tmall 상품 페이지인지 확인
2. 페이지가 완전히 로드된 후 Extension 클릭
3. Chrome 개발자 도구(F12) → Console에서 오류 확인

### 백엔드 연결 실패

1. 백엔드 URL이 올바른지 확인
2. 백엔드 서버가 실행 중인지 확인
3. CORS 설정 확인 (백엔드에서)

## 다음 단계

- [ ] 아이콘 디자인 추가
- [ ] 백엔드 API 엔드포인트 구현
- [ ] 번역 기능 통합 (Extension에서 또는 백엔드에서)
- [ ] 에러 핸들링 개선
- [ ] Chrome Web Store에 배포
