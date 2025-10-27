# Railway 환경변수 확인 및 설정

## 문제
Pro Plan을 사용 중인데도 403 에러 또는 "no results found" 발생

## 원인
Railway 배포 환경에 환경변수가 제대로 설정되지 않았을 가능성

## 해결 방법

### 1. Railway 대시보드에서 확인
1. https://railway.app 접속
2. BuyPilot 프로젝트 선택
3. Backend 서비스 선택
4. "Variables" 탭 클릭

### 2. 확인해야 할 환경변수

#### RAPIDAPI_KEY
- **현재 로컬 값**: `eb90089f15mshae4c5e1bbfb906bp1bcb68jsn866ee82b9237`
- **확인 필요**: Railway에 동일한 값이 설정되어 있는지
- **Pro Plan 확인**: RapidAPI 대시보드에서 실제 사용 중인 API 키 확인

#### GEMINI_API_KEY
- **현재 로컬 값**: `your-gemini-api-key-here` (플레이스홀더)
- **설정 필요**: 실제 Gemini API 키로 교체

### 3. Railway 환경변수 설정 명령어

```bash
# Railway CLI로 설정 (터미널에서)
railway variables set RAPIDAPI_KEY=your-actual-pro-plan-key-here
railway variables set GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. RapidAPI Pro Plan 키 확인 방법

1. https://rapidapi.com/hub 접속
2. 우측 상단 프로필 → "My Apps" 클릭
3. 사용 중인 앱 선택
4. "Security" 탭에서 API Key 복사
5. **중요**: Default Application의 키와 Pro Plan 앱의 키가 다를 수 있음

### 5. 설정 후 확인

```bash
# Railway 서비스 재시작
railway up

# 로그 확인
railway logs
```

### 6. 로컬 테스트용 스크립트

Railway에 배포하기 전에 로컬에서 Pro Plan 키로 테스트:

```bash
cd /Users/johyeon-ung/Desktop/BuyPilot/backend

# .env 파일에 Pro Plan 키 설정 후
python test_rapidapi_detailed.py
```

## 체크리스트

- [ ] RapidAPI 대시보드에서 Pro Plan 구독 확인
- [ ] Pro Plan API 키 복사
- [ ] Railway Variables 탭에서 RAPIDAPI_KEY 업데이트
- [ ] Gemini API 키 발급 및 설정
- [ ] Railway 서비스 재배포
- [ ] 제품 임포트 재시도

## 참고

로컬 테스트에서는 제품 `681298346857`이 작동했지만, Pro Plan을 사용 중이라면 더 많은 제품이 작동해야 합니다.

Railway 로그에서 "⚠️ Item Details returned 403"이 발생한다면:
- API 키가 Railway에 설정되지 않았거나
- 잘못된 API 키가 설정되었을 가능성이 높습니다.
