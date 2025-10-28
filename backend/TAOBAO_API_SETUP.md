# Taobao Open Platform API 설정 가이드

BuyPilot의 타오바오 상품 자동 가져오기 기능을 사용하기 위해 타오바오 오픈 플랫폼 API 설정이 필요합니다.

## 📋 사전 준비

### 필수 요구사항
- ✅ 타오바오 계정 (본인 인증 완료)
- ✅ 중국 휴대폰 번호 (SMS 인증용)
- ✅ 신분증 정보 (개인 개발자 인증용)

### 선택 사항
- 법인 사업자 등록증 (기업 개발자용, 일일 API 호출 제한이 더 높음)

---

## 🚀 1단계: 타오바오 오픈 플랫폼 가입

### 1-1. 계정 생성
1. **타오바오 오픈 플랫폼 접속**
   - URL: https://open.taobao.com/
   - 우측 상단 "登录" (로그인) 클릭

2. **타오바오 계정으로 로그인**
   - 기존 타오바오 계정 사용
   - 없으면 회원가입 진행

3. **개발자 인증 시작**
   - 로그인 후 "控制台" (콘솔) 클릭
   - "开发者认证" (개발자 인증) 메뉴 선택

### 1-2. 개인 개발자 인증
1. **인증 타입 선택**
   - "个人开发者" (개인 개발자) 선택

2. **정보 입력**
   - **실명**: 신분증 상의 이름
   - **身份证号**: 신분증 번호
   - **联系电话**: 중국 휴대폰 번호
   - **邮箱**: 이메일 주소

3. **SMS 인증**
   - 휴대폰으로 전송된 인증번호 입력
   - "提交" (제출) 클릭

4. **심사 대기**
   - 보통 1-3 영업일 소요
   - 승인 시 SMS와 이메일로 통지

---

## 🔧 2단계: 애플리케이션 생성

### 2-1. 애플리케이션 등록
1. **콘솔 접속**
   - https://console.open.taobao.com/
   - "应用管理" → "创建应用" 클릭

2. **애플리케이션 정보 입력**
   ```
   应用名称 (앱 이름): BuyPilot
   应用类型 (앱 타입): 自用型应用 (자체 사용)
   应用场景 (사용 시나리오): 商品信息获取 (상품 정보 가져오기)
   应用简介 (앱 설명): 타오바오 상품 정보 자동 수집 시스템
   ```

3. **앱 아이콘 업로드**
   - 120x120 픽셀 PNG 이미지
   - 배경 투명 권장

4. **콜백 URL 설정** (선택)
   ```
   回调地址: http://localhost:4070/api/v1/webhooks/taobao
   ```

5. **제출 및 심사**
   - "提交审核" 클릭
   - 심사 통과까지 1-2일 소요

### 2-2. App Key 및 App Secret 획득
1. **애플리케이션 목록 확인**
   - "应用管理" → "我的应用"
   - 생성한 앱 클릭

2. **인증 정보 복사**
   ```
   App Key: 12345678
   App Secret: 1234567890abcdef1234567890abcdef
   ```

   ⚠️ **보안 주의**: App Secret은 절대 공개하지 마세요!

---

## 📦 3단계: API 권한 신청

### 3-1. 필요한 API 권한
BuyPilot에서 사용하는 API:

| API 이름 | 용도 | 무료 여부 |
|---------|------|-----------|
| `taobao.item.get` | 상품 상세 정보 조회 | ✅ 무료 |
| `taobao.items.search` | 상품 검색 (선택) | ⚠️ 특별 권한 필요 |

### 3-2. API 권한 신청 방법
1. **API 문서 페이지 접속**
   - https://open.taobao.com/api.htm?docId=24625
   - "taobao.item.get" 검색

2. **권한 신청**
   - "申请权限" (권한 신청) 클릭
   - 사용 목적 설명:
     ```
     个人使用，用于自动获取淘宝商品信息，
     方便管理和分析商品数据。
     (개인 사용, 타오바오 상품 정보 자동 수집,
     상품 데이터 관리 및 분석용)
     ```

3. **즉시 승인**
   - `taobao.item.get` API는 보통 즉시 승인됨
   - 콘솔에서 "已授权API" (승인된 API) 확인

### 3-3. 일일 호출 제한
무료 개인 개발자 계정 제한:
- **초당 요청**: 2 calls/sec
- **일일 요청**: 1,000 calls/day

**하루 500-800개 상품 등록 시**: 문제 없음 ✅

---

## ⚙️ 4단계: BuyPilot 설정

### 4-1. 환경 변수 설정
Backend 폴더의 `.env` 파일 생성:

```bash
cd backend
cp .env.example .env
```

`.env` 파일 편집:
```env
# Taobao Open Platform API
TAOBAO_APP_KEY=12345678
TAOBAO_APP_SECRET=1234567890abcdef1234567890abcdef
TAOBAO_SESSION_KEY=  # 선택 사항 (일부 API만 필요)
```

### 4-2. Dependencies 설치
```bash
cd backend
pip install -r requirements.txt
```

필수 패키지:
- `top-api==1.0.1` - 타오바오 공식 SDK
- `urllib3==2.0.7` - URL 파싱
- `Pillow==10.1.0` - 이미지 처리

### 4-3. 서버 시작 및 테스트
```bash
python app.py
```

로그 확인:
```
✅ Taobao API connector initialized
 * Running on http://0.0.0.0:4070
```

---

## 🧪 5단계: API 테스트

### 5-1. 간단한 테스트
터미널에서 cURL로 테스트:

```bash
# 타오바오 상품 URL
PRODUCT_URL="https://item.taobao.com/item.htm?id=660094726752"

# 상품 가져오기
curl -X POST http://localhost:4070/api/v1/products/import \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$PRODUCT_URL\"}"
```

### 5-2. 성공 응답 예시
```json
{
  "ok": true,
  "data": {
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Product imported successfully",
    "product": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "source": "taobao",
      "title": "2024新款秋冬季卫衣男潮牌连帽加绒加厚宽松情侣装外套",
      "price": "89.90",
      "currency": "CNY",
      "stock": 9527,
      "image_url": "https://img.alicdn.com/imgextra/i1/123456/O1CN01ABC123_!!123456.jpg",
      "score": 4.8,
      "data": {
        "taobao_item_id": "660094726752",
        "seller_nick": "店铺名称",
        "images": [
          "https://img.alicdn.com/imgextra/i1/123456/O1CN01ABC123_!!123456.jpg",
          "https://img.alicdn.com/imgextra/i2/123456/O1CN01DEF456_!!123456.jpg"
        ],
        "desc": "商品详情描述...",
        "location": "浙江 杭州"
      }
    }
  }
}
```

### 5-3. 에러 처리
| 에러 코드 | 원인 | 해결 방법 |
|---------|------|----------|
| `CONFIG_ERROR` | API 키 미설정 | `.env` 파일 확인 |
| `INVALID_URL` | 잘못된 URL | 타오바오 상품 URL 확인 |
| `FETCH_ERROR` | API 호출 실패 | API 권한 및 네트워크 확인 |
| `RATE_LIMIT` | 호출 제한 초과 | 일일 1,000회 제한 확인 |

---

## 📊 6단계: API 사용량 모니터링

### 6-1. 콘솔에서 확인
1. **타오바오 오픈 플랫폼 콘솔 접속**
   - https://console.open.taobao.com/

2. **API 호출 통계**
   - "数据统计" → "API调用统计"
   - 일별/월별 호출 횟수 확인

3. **제한 확인**
   - 일일 호출 잔여량
   - 초당 호출 제한 (QPS)

### 6-2. 로그 모니터링
Backend 로그에서 확인:
```
🔍 Importing product from URL: https://item.taobao.com/item.htm?id=...
✅ Extracted product ID: 660094726752
🔄 Fetching product info for ID: 660094726752
✅ Successfully fetched product: 2024新款秋冬季卫衣...
✅ Product imported successfully: 550e8400-e29b-41d4-a716-446655440000
```

---

## 🚨 문제 해결 (Troubleshooting)

### ❌ "TAOBAO_APP_KEY must be set"
**원인**: 환경 변수 미설정

**해결**:
```bash
# .env 파일 존재 확인
ls -la backend/.env

# .env 파일 내용 확인
cat backend/.env | grep TAOBAO

# 서버 재시작
python backend/app.py
```

### ❌ "Invalid app key or app secret"
**원인**: 잘못된 API 인증 정보

**해결**:
1. 타오바오 오픈 플랫폼 콘솔에서 App Key/Secret 재확인
2. `.env` 파일에 정확히 복사
3. 공백이나 특수문자 확인
4. 서버 재시작

### ❌ "Insufficient permissions"
**원인**: API 권한 미신청 또는 거부됨

**해결**:
1. 콘솔 → "已授权API" 확인
2. `taobao.item.get` API 권한 있는지 확인
3. 없으면 권한 재신청
4. 승인 대기 (보통 즉시)

### ❌ "Rate limit exceeded"
**원인**: 일일 1,000회 또는 초당 2회 제한 초과

**해결**:
1. 콘솔에서 호출량 확인
2. 내일까지 대기 (일일 제한)
3. 또는 요청 속도 조절 (초당 2회 미만)
4. 필요시 기업 개발자 계정으로 업그레이드

### ❌ "Network timeout"
**원인**: 네트워크 연결 문제 또는 방화벽

**해결**:
1. 인터넷 연결 확인
2. 중국 서버 접속 가능 여부 확인
3. VPN 사용 (중국 외 지역에서 권장)
4. 방화벽 설정 확인

---

## 📚 참고 자료

### 공식 문서
- **타오바오 오픈 플랫폼**: https://open.taobao.com/
- **API 문서**: https://open.taobao.com/api.htm
- **개발자 가이드**: https://open.taobao.com/docV3.htm?docId=102635
- **FAQ**: https://open.taobao.com/doc.htm?docId=102635&docType=1

### API Reference
- **taobao.item.get**: https://open.taobao.com/api.htm?docId=24625
- **Error Codes**: https://open.taobao.com/doc.htm?docId=114&docType=1

### SDK & Tools
- **TOP SDK (Python)**: https://github.com/alibaba/taobao-top-python-sdk
- **Postman Collection**: [타오바오 API 테스트용]

---

## ✅ 설정 완료 체크리스트

- [ ] 타오바오 오픈 플랫폼 계정 생성
- [ ] 개인 개발자 인증 완료
- [ ] 애플리케이션 생성 및 승인
- [ ] App Key & App Secret 획득
- [ ] `taobao.item.get` API 권한 획득
- [ ] Backend `.env` 파일 설정
- [ ] Dependencies 설치 완료
- [ ] Backend 서버 시작 성공
- [ ] API 테스트 성공 (cURL 또는 Postman)
- [ ] Frontend에서 상품 가져오기 테스트

---

## 🎉 다음 단계

설정이 완료되면 다음 기능을 사용할 수 있습니다:

1. **Frontend 상품 등록 페이지**
   - 타오바오 URL 입력
   - 자동으로 상품 정보 가져오기
   - 이미지 편집 (워터마크 제거)
   - 상품 목록 관리

2. **대량 상품 등록**
   - CSV 파일 업로드
   - 일괄 상품 가져오기
   - 진행 상황 모니터링

3. **AI 상품 분석** (Phase 5)
   - 자동 가격 비교
   - 품질 점수 평가
   - 판매 예측

---

문제가 발생하면 Backend 로그를 확인하거나 이슈를 생성해주세요!
