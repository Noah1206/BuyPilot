# Phase 2: 백그라운드 작업 시스템 테스트 가이드

Phase 2에서는 APScheduler를 사용한 비동기 백그라운드 작업 시스템이 구현되었습니다.

## 🎯 구현된 기능

### 1. 백그라운드 스케줄러 (APScheduler)
- ✅ 비동기 작업 관리
- ✅ 작업 큐 시스템
- ✅ 재시도 로직
- ✅ 에러 처리

### 2. 구매 Worker (Purchase Worker)
- ✅ 공급처 API 호출 시뮬레이션
- ✅ 2초 지연 후 90% 성공률
- ✅ 실패 시 최대 3회 재시도 (30초 간격)
- ✅ 재시도 실패 시 MANUAL_REVIEW 상태로 전환
- ✅ Audit log 기록

### 3. 배송 Worker (Forwarder Worker)
- ✅ 배대지 API 호출 시뮬레이션
- ✅ 1.5초 지연 후 95% 성공률
- ✅ 실패 시 최대 3회 재시도 (30초 간격)
- ✅ 재시도 실패 시 MANUAL_REVIEW 상태로 전환
- ✅ 송장번호 자동 생성
- ✅ Audit log 기록

## 🧪 테스트 방법

### 준비 작업

1. **Backend 서버 시작**
```bash
cd backend
python app.py
```

시작 로그 확인:
```
✅ Database initialized successfully
✅ Background scheduler started successfully
 * Running on http://0.0.0.0:4070
```

2. **Frontend 시작** (다른 터미널)
```bash
cd frontend
npm run dev
```

### 테스트 1: 정상 구매 흐름

#### 1-1. 주문 생성
1. http://localhost:3000 접속
2. "데모 생성" 버튼 클릭
3. 주문 카드 생성 확인
4. 상태: **대기중** (PENDING)

#### 1-2. 구매 실행 (백그라운드 작업)
1. "구매 실행" 버튼 클릭
2. 즉시 상태: **구매 진행중** (SUPPLIER_ORDERING)
3. Backend 로그 확인:
```
🔄 [Job job-xxxxx] Starting purchase execution for order xxxxx (attempt 1/3)
✅ [Job job-xxxxx] Supplier API call successful (simulated)
✅ [Job job-xxxxx] Purchase completed successfully
```
4. **약 2초 후** 상태 자동 변경: **구매 완료** (ORDERED_SUPPLIER)
5. 공급처 주문번호 생성: `SUP-XXXXXXXX`

#### 1-3. 배대지 전송 (백그라운드 작업)
1. "배대지 전송" 버튼 클릭
2. 즉시 상태: **배대지 전송중** (FORWARDER_SENDING)
3. Backend 로그 확인:
```
🔄 [Job job-fwd-xxxxx] Starting forwarder job for order xxxxx (attempt 1/3)
✅ [Job job-fwd-xxxxx] Forwarder API call successful (simulated) - tracking: TRKxxxxxxxxxxxx
✅ [Job job-fwd-xxxxx] Forwarder job completed successfully
```
4. **약 1.5초 후** 상태 자동 변경: **배송중** (SENT_TO_FORWARDER)
5. 송장번호 생성: `TRKxxxxxxxxxxxx`

### 테스트 2: 재시도 로직 테스트

구매/배송 작업은 10%/5% 확률로 실패하도록 설정되어 있습니다. 여러 번 시도하면 재시도 로직을 볼 수 있습니다.

#### 2-1. 실패 시나리오 관찰
1. 여러 개의 데모 주문 생성 (5-10개)
2. 모두 "구매 실행" 클릭
3. Backend 로그에서 실패 케이스 확인:
```
⚠️ [Job job-xxxxx] Supplier API call failed (simulated)
⚠️ [Job job-xxxxx] Purchase failed for order xxxxx, scheduling retry 2/3 in 30s
```

#### 2-2. 재시도 자동 실행 확인
1. 실패한 주문의 상태: **재시도중** (RETRYING)
2. 30초 대기
3. Backend 로그에서 재시도 확인:
```
🔄 [Job job-xxxxx-retry-1] Starting purchase execution for order xxxxx (attempt 2/3)
```
4. 재시도 성공 시 상태 변경: **구매 완료**
5. 재시도 실패 시 3회 반복 후 **검토 필요** (MANUAL_REVIEW) 상태로 전환

### 테스트 3: Audit Log 확인

#### 3-1. Supabase에서 로그 조회
1. Supabase Dashboard 접속
2. Table Editor → `audit_log` 테이블
3. 다음 이벤트 확인:
   - `execute_purchase` - 사용자가 구매 버튼 클릭
   - `purchase_completed` - 구매 성공
   - `purchase_retry_scheduled` - 재시도 예약
   - `purchase_failed` - 최종 실패
   - `send_to_forwarder` - 사용자가 배대지 전송 버튼 클릭
   - `forwarder_completed` - 배송 성공
   - `forwarder_retry_scheduled` - 재시도 예약
   - `forwarder_failed` - 최종 실패

#### 3-2. 메타데이터 확인
각 audit log의 `meta` 필드에서 상세 정보 확인:
```json
{
  "job_id": "job-xxxxx",
  "supplier_order_id": "SUP-XXXXXXXX",
  "attempts": 2,
  "tracking_number": "TRKxxxxxxxxxxxx"
}
```

### 테스트 4: 상태 전이 확인

#### 4-1. 정상 흐름
```
PENDING → SUPPLIER_ORDERING → ORDERED_SUPPLIER → FORWARDER_SENDING → SENT_TO_FORWARDER
```

#### 4-2. 재시도 흐름
```
PENDING → SUPPLIER_ORDERING → RETRYING → SUPPLIER_ORDERING → ORDERED_SUPPLIER
```

#### 4-3. 실패 흐름
```
PENDING → SUPPLIER_ORDERING → RETRYING → RETRYING → MANUAL_REVIEW
```

## 📊 성능 측정

### 예상 처리 시간
- **구매 작업**: 약 2-3초 (성공 시)
- **배송 작업**: 약 1.5-2.5초 (성공 시)
- **재시도 간격**: 30초
- **전체 흐름** (성공): 약 4-6초

### 동시 처리
- **최대 동시 작업**: 10개 (ThreadPoolExecutor)
- **작업 인스턴스**: 최대 3개/작업

## 🐛 문제 해결

### Backend 로그에 Worker 관련 오류가 없음
- APScheduler가 정상 시작되었는지 확인
- 로그에 "✅ Background scheduler started successfully" 메시지 확인

### 상태가 변경되지 않음
- Backend 서버가 실행 중인지 확인
- Frontend 새로고침 (F5)
- Browser Console에서 에러 확인

### 재시도가 작동하지 않음
- Backend 로그에서 "scheduling retry" 메시지 확인
- 30초 이상 대기
- Supabase에서 `orders` 테이블의 `meta` 필드 확인

## ✅ Phase 2 완료 체크리스트

- [x] APScheduler 설정 완료
- [x] Purchase Worker 구현
- [x] Forwarder Worker 구현
- [x] 재시도 로직 구현 (최대 3회, 30초 간격)
- [x] Audit log 기록
- [x] Routes에 작업 큐 등록
- [x] 정상 흐름 테스트 성공
- [x] 재시도 로직 테스트 성공
- [x] 실패 처리 테스트 성공

## 🚀 다음 단계: Phase 3

Phase 3에서는 **Mock API**를 구현하여 실제 API 연동 전 완전한 작동 흐름을 구축합니다.

**다음 작업 내용**:
1. Base connector 인터페이스
2. Mock Supplier API (타오바오 시뮬레이션)
3. Mock Forwarder API (배대지 시뮬레이션)
4. 웹훅 시그니처 검증 활성화
5. 실제 API 호출 패턴 구현

---

## 참고 자료

- [APScheduler 문서](https://apscheduler.readthedocs.io/)
- [Python Threading 문서](https://docs.python.org/3/library/threading.html)
- [Flask Background Tasks](https://flask.palletsprojects.com/en/2.3.x/patterns/celery/)
