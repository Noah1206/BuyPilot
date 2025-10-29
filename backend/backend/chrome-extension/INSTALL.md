# BuyPilot Chrome Extension 설치 가이드

## 🚀 빠른 시작

### 1단계: 아이콘 생성 (선택사항)

아이콘 파일이 없어도 Extension은 작동하지만, 아이콘이 있으면 더 좋습니다.

#### 옵션 A: 온라인 생성 (추천)
1. https://www.canva.com 접속
2. "128 x 128 px" 크기로 아이콘 디자인
3. 다음 크기로 각각 다운로드:
   - icon128.png (128x128)
   - icon48.png (48x48)
   - icon32.png (32x32)
   - icon16.png (16x16)
4. `chrome-extension/icons/` 폴더에 저장

#### 옵션 B: 임시 아이콘 스킵
아이콘 없이도 Extension 작동 가능 (Chrome이 기본 아이콘 사용)

### 2단계: Chrome Extension 로드

1. **Chrome 브라우저 열기**

2. **확장 프로그램 페이지 이동**
   - 주소창에 입력: `chrome://extensions/`
   - 또는 ⋮ 메뉴 → 도구 더보기 → 확장 프로그램

3. **개발자 모드 활성화**
   - 우측 상단의 "개발자 모드" 토글을 ON

4. **Extension 로드**
   - "압축해제된 확장 프로그램을 로드합니다" 버튼 클릭
   - 폴더 선택: `/Users/johyeon-ung/Desktop/BuyPilot/chrome-extension`
   - "선택" 클릭

5. **확인**
   - Extension 목록에 "BuyPilot - Taobao Product Importer" 표시됨
   - 브라우저 우측 상단에 Extension 아이콘 표시 (또는 퍼즐 아이콘 클릭)

### 3단계: Extension 사용하기

#### A. Taobao 제품 페이지로 이동

예시 제품 (작동 확인용):
```
https://item.taobao.com/item.htm?id=681298346857
```

#### B. Extension 아이콘 클릭

- 브라우저 우측 상단의 BuyPilot 아이콘 클릭
- Popup 창이 열리면서 자동으로 제품 정보 추출

#### C. 상품 가져오기

1. Popup에서 제품 정보 확인 (이미지, 제목, 가격)
2. "상품 가져오기" 버튼 클릭
3. 성공 메시지 확인: "✅ 상품이 성공적으로 추가되었습니다!"
4. "대시보드 열기" 링크 클릭하여 확인

## ⚙️ 설정

### 백엔드 URL 변경

Extension Popup 하단의 "백엔드 URL" 입력란에서 변경 가능:

**프로덕션 (Railway):**
```
https://buypilot.railway.app
```

**로컬 개발:**
```
http://localhost:8080
```

변경 후 자동 저장됨.

## 🧪 테스트

### 1. 로컬 백엔드 실행

```bash
cd /Users/johyeon-ung/Desktop/BuyPilot/backend
python app.py
```

### 2. Extension에서 백엔드 URL 설정

```
http://localhost:8080
```

### 3. Taobao 제품 가져오기 테스트

1. https://item.taobao.com/item.htm?id=681298346857 방문
2. Extension 아이콘 클릭
3. "상품 가져오기" 클릭
4. 백엔드 로그 확인:
   ```
   INFO:routes.products:📦 Extension import request: 681298346857
   INFO:routes.products:🌐 Translating to Korean...
   INFO:routes.products:📷 Downloading images...
   INFO:routes.products:✅ Product imported from extension: [product_id]
   ```

5. Frontend (http://localhost:3001/products)에서 제품 확인

## 🔧 트러블슈팅

### Extension이 로드되지 않음

**문제**: "manifest.json 오류" 메시지
**해결**:
1. manifest.json 파일이 존재하는지 확인
2. JSON 문법 오류 확인
3. Chrome 버전 확인 (최신 버전 권장)

### 상품 정보가 추출되지 않음

**문제**: "상품 정보를 찾을 수 없습니다" 메시지
**해결**:
1. Taobao/Tmall 상품 페이지인지 확인
2. 페이지가 완전히 로드될 때까지 대기
3. F12 → Console에서 오류 메시지 확인
4. "새로고침" 버튼 클릭하여 재시도

### 백엔드 연결 실패

**문제**: "오류: Failed to fetch" 메시지
**해결**:
1. 백엔드 서버가 실행 중인지 확인
2. 백엔드 URL이 올바른지 확인
3. CORS 설정 확인:
   ```python
   # backend/app.py에서
   CORS(app, resources={
       r"/api/*": {
           "origins": ["chrome-extension://*", "http://localhost:*"]
       }
   })
   ```

### 이미지가 표시되지 않음

**문제**: Extension Popup에서 제품 이미지가 "깨짐"
**해결**:
1. Taobao 이미지 URL이 HTTPS인지 확인
2. content.js에서 이미지 URL 추출 로직 확인
3. 네트워크 탭에서 이미지 요청 상태 확인

## 📊 데이터 흐름

```
1. [Taobao Page]
   ↓ (페이지 로드)
2. [Content Script]
   - DOM에서 데이터 추출
   - chrome.storage에 저장
   ↓
3. [Popup UI]
   - 저장된 데이터 읽기
   - 사용자에게 프리뷰 표시
   ↓ (사용자 클릭)
4. [Backend API]
   - POST /api/products/import-from-extension
   - 번역 (Gemini API)
   - 이미지 다운로드
   - DB 저장
   ↓
5. [Frontend Dashboard]
   - /products 페이지에 표시
```

## 🎯 다음 단계

Extension이 정상 작동하면:

1. **Railway에 배포**
   ```bash
   git add .
   git commit -m "Add Chrome Extension for Taobao import"
   git push
   ```

2. **Extension에서 Railway URL 설정**
   ```
   https://buypilot.railway.app
   ```

3. **실제 Taobao 제품으로 테스트**

4. **(선택) Chrome Web Store에 배포**
   - https://chrome.google.com/webstore/devconsole
   - 개발자 등록 ($5 일회성 비용)
   - Extension 패키징 및 업로드

## 💡 팁

### Extension 디버깅

1. **Content Script 디버깅**
   - Taobao 페이지에서 F12 → Console
   - "BuyPilot Extension" 로그 확인

2. **Popup 디버깅**
   - Extension 아이콘 우클릭 → "검사"
   - Popup DevTools 열림

3. **Background Script 디버깅**
   - chrome://extensions/ → "서비스 워커" 클릭
   - Background script console 열림

### 빠른 재로드

Extension 코드를 수정한 후:
1. chrome://extensions/ 이동
2. BuyPilot Extension의 "새로고침" 아이콘 클릭
3. Taobao 페이지 새로고침

## 🎨 아이콘 디자인 가이드

아이콘 디자인 시 권장사항:

- **색상**: 보라색 (#667eea) - BuyPilot 브랜드 컬러
- **심볼**: 📦 (상자) 또는 BP (이니셜)
- **스타일**: 심플하고 인식하기 쉬운 디자인
- **크기**: 128x128, 48x48, 32x32, 16x16 (각각 필요)

무료 아이콘 생성 도구:
- Canva (https://www.canva.com)
- Figma (https://www.figma.com)
- GIMP (https://www.gimp.org)
