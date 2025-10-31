# BuyPilot AWS 배포 가이드

네이버 Commerce API IP 제한 문제 해결을 위한 AWS EC2 + Elastic IP 배포 가이드

## 📋 사전 준비

### 필요한 것들
- AWS 계정
- AWS CLI 설치 (선택사항)
- SSH 키페어
- Railway에서 사용 중인 환경 변수 목록

### 예상 비용
- EC2 t3.small (Seoul): ~$15/month
- Elastic IP: 무료 (인스턴스에 연결 시)
- EBS 스토리지 (30GB): ~$3/month
- 데이터 전송: ~$5/month
- **총 예상**: $20-25/month

---

## 🚀 1단계: EC2 인스턴스 생성

### 1.1 AWS Console 접속
1. https://console.aws.amazon.com 접속
2. 서비스 → EC2 클릭
3. 리전 선택: **ap-northeast-2 (Seoul)** 또는 **ap-southeast-1 (Singapore)**

### 1.2 인스턴스 시작
1. **"인스턴스 시작"** 버튼 클릭
2. 다음 설정 선택:

```yaml
이름: buypilot-production
AMI: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
인스턴스 유형: t3.small (2 vCPU, 2GB RAM)
키 페어: 새로 생성 또는 기존 키 선택
네트워크 설정:
  - VPC: 기본값
  - 퍼블릭 IP 자동 할당: 활성화
  - 보안 그룹 생성:
      규칙 1 - SSH: 포트 22, 내 IP
      규칙 2 - HTTP: 포트 80, 0.0.0.0/0
      규칙 3 - HTTPS: 포트 443, 0.0.0.0/0
      규칙 4 - Custom TCP: 포트 8080, 0.0.0.0/0
스토리지: 30 GB gp3
```

3. **"인스턴스 시작"** 클릭

### 1.3 키 페어 다운로드
- 새 키 페어 생성 시 `.pem` 파일 다운로드
- 파일 권한 설정: `chmod 400 buypilot-key.pem`

---

## 🌐 2단계: Elastic IP 할당

### 2.1 Elastic IP 생성
1. EC2 대시보드 → **네트워크 및 보안** → **Elastic IP** 클릭
2. **"Elastic IP 주소 할당"** 클릭
3. 기본 설정 유지하고 **"할당"** 클릭

### 2.2 Elastic IP 연결
1. 방금 생성한 Elastic IP 선택
2. **작업** → **Elastic IP 주소 연결** 클릭
3. 인스턴스: `buypilot-production` 선택
4. **"연결"** 클릭

### 2.3 Elastic IP 기록
```bash
# 할당된 Elastic IP 주소를 기록하세요
# 예: 52.79.123.45
ELASTIC_IP=<your-elastic-ip>
```

---

## 🔧 3단계: EC2 서버 설정

### 3.1 SSH 접속
```bash
ssh -i buypilot-key.pem ubuntu@<ELASTIC_IP>
```

### 3.2 시스템 업데이트
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 3.3 Docker 설치
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker ubuntu

# 로그아웃 후 재접속 (docker 그룹 적용)
exit
ssh -i buypilot-key.pem ubuntu@<ELASTIC_IP>

# Docker 버전 확인
docker --version
```

### 3.4 Docker Compose 설치
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## 📦 4단계: 애플리케이션 배포

### 4.1 Git 설치 및 레포지토리 클론
```bash
sudo apt-get install -y git
cd /home/ubuntu
git clone https://github.com/Noah1206/BuyPilot.git
cd BuyPilot
```

### 4.2 환경 변수 설정

#### Railway에서 환경 변수 내보내기
Railway Dashboard에서:
1. BuyPilot 프로젝트 → backend 서비스
2. **Variables** 탭 클릭
3. 모든 환경 변수 복사

#### EC2에서 .env 파일 생성
```bash
cd /home/ubuntu/BuyPilot
nano .env
```

**필수 환경 변수** (Railway에서 복사):
```bash
# Database
SUPABASE_DB_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Naver Commerce API
NAVER_COMMERCE_CLIENT_ID=5hFeoCcp4vMIr3i3uxciB2
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$6rIRS1Vadkk69UlEfByIy.

# Naver TalkTalk
NAVER_TALK_PARTNER_ID=your-partner-id
NAVER_TALK_AUTHORIZATION=your-auth-key

# Taobao
TAOBAO_APP_KEY=your-app-key
TAOBAO_APP_SECRET=your-app-secret

# CORS (AWS Elastic IP로 변경)
ALLOWED_ORIGINS=http://<ELASTIC_IP>:8080,http://localhost:3000

# Flask
FLASK_ENV=production
FLASK_DEBUG=False
PORT=8080
```

저장: `Ctrl+X` → `Y` → `Enter`

### 4.3 Docker Compose 파일 생성
```bash
cd /home/ubuntu/BuyPilot
nano docker-compose.yml
```

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: buypilot-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - ./backend/storage:/app/backend/storage
    environment:
      - PORT=8080
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

저장: `Ctrl+X` → `Y` → `Enter`

### 4.4 애플리케이션 빌드 및 실행
```bash
cd /home/ubuntu/BuyPilot

# Docker 이미지 빌드 (10-15분 소요)
docker-compose build

# 컨테이너 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4.5 서비스 상태 확인
```bash
# 컨테이너 상태 확인
docker-compose ps

# Health check
curl http://localhost:8080/health
```

---

## 🔐 5단계: 네이버 Commerce API 설정

### 5.1 Elastic IP 등록
1. 네이버 Commerce API 센터 접속
2. 애플리케이션 상세 → API호출 IP 설정
3. **Elastic IP 주소** 입력: `<ELASTIC_IP>`
4. **저장** 클릭

### 5.2 테스트
```bash
# EC2 서버에서 테스트
curl -X POST http://localhost:8080/api/v1/smartstore/register-products \
  -H "Content-Type: application/json"
```

Railway 로그에서 `IP_NOT_ALLOWED` 에러가 사라지고 `✅ OAuth 2.0 access token obtained` 성공 메시지 확인

---

## 🌍 6단계: 도메인 설정 (선택사항)

### 6.1 DNS A 레코드 추가
도메인 DNS 설정에서:
```
Type: A
Name: api (또는 @)
Value: <ELASTIC_IP>
TTL: 300
```

### 6.2 SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# Nginx 설치
sudo apt-get install -y nginx

# SSL 인증서 발급
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 7단계: 자동 재시작 설정

### 7.1 Systemd 서비스 생성
```bash
sudo nano /etc/systemd/system/buypilot.service
```

```ini
[Unit]
Description=BuyPilot Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/BuyPilot
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 7.2 서비스 활성화
```bash
sudo systemctl enable buypilot
sudo systemctl start buypilot
sudo systemctl status buypilot
```

---

## 📊 8단계: 모니터링 및 유지보수

### 8.1 로그 확인
```bash
# 실시간 로그
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100

# 특정 서비스 로그
docker-compose logs app
```

### 8.2 컨테이너 재시작
```bash
# 재시작
docker-compose restart

# 정지
docker-compose down

# 시작
docker-compose up -d
```

### 8.3 코드 업데이트
```bash
cd /home/ubuntu/BuyPilot
git pull origin main
docker-compose build
docker-compose up -d
```

### 8.4 디스크 정리
```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a -f

# 디스크 사용량 확인
df -h
```

---

## 🆘 문제 해결

### 서비스가 시작되지 않을 때
```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs

# 환경 변수 확인
docker-compose config
```

### IP_NOT_ALLOWED 에러가 계속 발생할 때
1. Elastic IP가 올바르게 연결되었는지 확인
2. 네이버 API 설정에 Elastic IP가 정확히 등록되었는지 확인
3. 5-10분 기다린 후 다시 테스트 (네이버 API 설정 반영 시간)

### 메모리 부족
```bash
# 메모리 사용량 확인
free -h

# 인스턴스 유형 업그레이드 고려 (t3.small → t3.medium)
```

---

## ✅ 배포 완료 체크리스트

- [ ] EC2 인스턴스 생성 및 실행 중
- [ ] Elastic IP 할당 및 연결
- [ ] Docker 및 Docker Compose 설치
- [ ] 애플리케이션 코드 클론
- [ ] 환경 변수 설정 완료
- [ ] Docker 컨테이너 실행 중
- [ ] Health check 통과 (`/health` 엔드포인트)
- [ ] 네이버 Commerce API에 Elastic IP 등록
- [ ] SmartStore 상품 등록 테스트 성공
- [ ] 자동 재시작 서비스 설정
- [ ] (선택) 도메인 및 SSL 설정

---

## 💰 비용 최적화

### Reserved Instance (예약 인스턴스)
- 1년 약정: ~30% 할인
- 3년 약정: ~50% 할인

### Spot Instance (스팟 인스턴스)
- 최대 90% 할인
- 단, 인스턴스가 중단될 수 있음 (프로덕션 비권장)

### Savings Plans
- 유연한 할인 플랜
- EC2, Fargate, Lambda 등 다양한 서비스에 적용

---

## 📞 지원

문제가 발생하면:
1. Docker 로그 확인: `docker-compose logs`
2. EC2 인스턴스 상태 확인
3. Elastic IP 연결 상태 확인
4. 네이버 API 설정 재확인
