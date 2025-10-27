# Extension 디버깅 가이드

## 현재 문제

스크린샷에서 보이는 문제:
- ❌ 제목: "제목 없음"
- ❌ 가격: ¥0
- ✅ ID: 972107467743 (추출됨)
- ❌ 404 에러: API 엔드포인트 없음

## 디버깅 단계

### 1. Content Script 디버깅

**Taobao 제품 페이지에서:**

1. F12 키를 눌러 개발자 도구 열기
2. Console 탭 선택
3. 다음 로그 확인:

```
🚀 BuyPilot Extension: Content script loaded
📄 Page loaded, extracting product data...
📦 Extracting Taobao product data...
✅ Product data extracted: {title: "...", price: ..., ...}
💾 Product data stored in chrome.storage
```

**문제 확인:**

만약 "제목 없음"이 나온다면, Console에서 다음 명령어로 수동 확인:

```javascript
// 제목 확인
document.querySelector('.tb-main-title')?.textContent
document.querySelector('[data-spm="1000983"]')?.textContent
document.querySelector('.ItemTitle--mainTitle--')?.textContent

// 가격 확인
document.querySelector('.tb-rmb-num')?.textContent
document.querySelector('[class*="priceText"]')?.textContent
```

### 2. Taobao 페이지 구조 변경 가능성

Taobao는 자주 HTML 구조를 변경합니다.

**현재 사용 중인 Selector:**

```javascript
// 제목
'.tb-main-title'
'[data-spm="1000983"]'
'.ItemTitle--mainTitle--'

// 가격
'.tb-rmb-num'
'[class*="priceText"]'
'[class*="Price--priceText"]'
```

**실제 페이지에서 확인:**

1. Taobao 제품 페이지에서 제목 영역 우클릭
2. "검사" 선택
3. HTML 구조 확인
4. class 이름이 위의 selector와 일치하는지 확인

### 3. 수동으로 데이터 추출 테스트

Console에서:

```javascript
// 전체 추출 함수 실행
function extractTaobaoProduct() {
  const url = window.location.href;
  const productIdMatch = url.match(/[?&]id=(\d+)/);
  const productId = productIdMatch ? productIdMatch[1] : null;

  const title = document.querySelector('.tb-main-title')?.textContent.trim() ||
                document.querySelector('[data-spm="1000983"]')?.textContent.trim() ||
                'No title found';

  const priceEl = document.querySelector('.tb-rmb-num') ||
                  document.querySelector('[class*="priceText"]');
  const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : 0;

  console.log({
    productId,
    title,
    price
  });

  return { productId, title, price };
}

extractTaobaoProduct();
```

### 4. 해결 방법

#### 방법 A: 로컬 백엔드로 먼저 테스트

```bash
# 터미널에서
cd /Users/johyeon-ung/Desktop/BuyPilot/backend
python app.py
```

Extension Popup에서:
- 백엔드 URL 변경: `http://localhost:8080`
- 다시 시도

#### 방법 B: Content Script 수정

실제 Taobao 페이지의 HTML 구조에 맞게 selector 업데이트 필요.

1. 올바른 selector 찾기
2. content.js 수정
3. chrome://extensions/에서 Extension 새로고침
4. Taobao 페이지 새로고침
5. 재시도

## 빠른 테스트

**작동하는 것으로 확인된 제품:**

```
https://item.taobao.com/item.htm?id=681298346857
```

이 제품으로 테스트해보세요. 이것도 안 되면 content script 수정이 필요합니다.

## 실시간 디버깅

**Popup 디버깅:**
1. Extension 아이콘 우클릭
2. "검사" 클릭
3. Popup DevTools 열림
4. Console에서 에러 확인

**Content Script 디버깅:**
1. Taobao 페이지에서 F12
2. Console에서 "BuyPilot" 로그 확인

## 다음 단계

1. ✅ ID는 추출됨 → URL 파싱은 작동
2. ❌ 제목/가격 추출 실패 → Selector 문제
3. ❌ 404 에러 → Railway 배포 필요

**우선순위:**
1. Content script selector 수정 (제품 정보 추출)
2. 로컬 백엔드로 테스트
3. Railway 배포
