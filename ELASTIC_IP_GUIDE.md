# AWS Elastic IP 할당 가이드

## 🎯 Elastic IP란?

**Elastic IP**는 AWS에서 제공하는 **고정 IP 주소**입니다.
- 일반 EC2 인스턴스는 재시작할 때마다 IP가 변경됨
- Elastic IP를 연결하면 **영구적으로 같은 IP 주소 유지**
- 네이버 Commerce API IP 화이트리스트에 등록하기 위해 필요

---

## 📋 사전 준비

EC2 인스턴스가 **먼저 생성되어 있어야** Elastic IP를 연결할 수 있습니다.

### EC2 인스턴스 생성 (아직 안 하셨다면)

1. **AWS Console** 접속: https://console.aws.amazon.com
2. 상단 검색창에 **"EC2"** 입력 → 클릭
3. 왼쪽 메뉴에서 **"인스턴스"** 클릭
4. **"인스턴스 시작"** 버튼 클릭

#### 인스턴스 설정:
```yaml
이름: buypilot-production

AMI: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
  - 검색창에 "ubuntu 22.04" 입력
  - "64비트 (x86)" 선택

인스턴스 유형: t3.small
  - vCPU: 2개
  - 메모리: 2 GiB
  - 월 예상 비용: ~$15

키 페어:
  - "새 키 페어 생성" 클릭
  - 키 페어 이름: buypilot-key
  - 키 페어 유형: RSA
  - 프라이빗 키 파일 형식: .pem
  - "키 페어 생성" 클릭 → buypilot-key.pem 자동 다운로드

네트워크 설정:
  - "편집" 클릭
  - VPC: 기본값
  - 서브넷: 기본값
  - 퍼블릭 IP 자동 할당: 활성화
  - 방화벽(보안 그룹): "보안 그룹 생성"

  보안 그룹 규칙:
    규칙 1:
      - 유형: SSH
      - 프로토콜: TCP
      - 포트 범위: 22
      - 소스 유형: 내 IP

    규칙 2:
      - 유형: HTTP
      - 프로토콜: TCP
      - 포트 범위: 80
      - 소스 유형: 0.0.0.0/0

    규칙 3:
      - 유형: HTTPS
      - 프로토콜: TCP
      - 포트 범위: 443
      - 소스 유형: 0.0.0.0/0

    규칙 4:
      - 유형: 사용자 지정 TCP
      - 프로토콜: TCP
      - 포트 범위: 8080
      - 소스 유형: 0.0.0.0/0

스토리지 구성:
  - 크기: 30 GiB
  - 볼륨 유형: gp3 (권장) 또는 gp2
```

5. 오른쪽 **"인스턴스 시작"** 버튼 클릭
6. **"인스턴스 시작 성공"** 메시지 확인 후 **"인스턴스로 이동"** 클릭

---

## 🌐 Elastic IP 할당 방법

### 1단계: Elastic IP 메뉴로 이동

1. **AWS EC2 Console** 접속: https://console.aws.amazon.com/ec2
2. 왼쪽 메뉴에서 **"네트워크 및 보안"** 섹션 찾기
3. **"Elastic IP"** 또는 **"탄력적 IP"** 클릭

### 2단계: Elastic IP 할당

1. **"Elastic IP 주소 할당"** 버튼 클릭 (오른쪽 상단 주황색 버튼)

2. 설정 화면:
   ```yaml
   네트워크 경계 그룹: ap-northeast-2 (또는 선택한 리전)
   퍼블릭 IPv4 주소 풀: Amazon의 IP 주소 풀
   태그 (선택사항):
     - 키: Name
     - 값: buypilot-elastic-ip
   ```

3. **"할당"** 버튼 클릭 (오른쪽 하단)

4. **성공 메시지** 확인:
   ```
   ✅ Elastic IP 주소를 성공적으로 할당했습니다

   할당된 IPv4 주소: XX.XX.XX.XX  <--- 이 IP 주소를 기록하세요!
   ```

5. **할당 ID**와 **IP 주소** 기록:
   ```bash
   # 예시
   Elastic IP: 52.79.123.45
   할당 ID: eipalloc-0abc123def456789
   ```

### 3단계: EC2 인스턴스에 Elastic IP 연결

1. 방금 할당한 **Elastic IP 주소**를 **선택** (체크박스 클릭)

2. 상단 **"작업"** 버튼 클릭 → **"Elastic IP 주소 연결"** 선택

3. 연결 설정:
   ```yaml
   리소스 유형: 인스턴스

   인스턴스:
     - 드롭다운에서 "buypilot-production" 선택
     - 또는 인스턴스 ID (i-xxxxxxxxxxxx) 선택

   프라이빗 IP 주소:
     - 기본값 유지 (자동으로 선택됨)

   재연결 허용: ✅ 체크 (권장)
   ```

4. **"연결"** 버튼 클릭 (오른쪽 하단)

5. **성공 메시지** 확인:
   ```
   ✅ Elastic IP 주소를 성공적으로 연결했습니다
   ```

### 4단계: 연결 확인

1. 왼쪽 메뉴에서 **"인스턴스"** 클릭

2. **"buypilot-production"** 인스턴스 선택

3. 하단 **세부 정보** 탭에서 확인:
   ```yaml
   퍼블릭 IPv4 주소: XX.XX.XX.XX  <--- Elastic IP가 표시됨
   퍼블릭 IPv4 DNS: ec2-xx-xx-xx-xx.ap-northeast-2.compute.amazonaws.com
   Elastic IP: XX.XX.XX.XX (연결됨)  <--- ✅ 표시되어야 함
   ```

---

## ✅ Elastic IP 할당 완료!

이제 **고정 IP 주소**를 얻었습니다!

### 다음 단계:

#### 1. SSH 접속 테스트
```bash
# 다운로드한 키 파일 권한 설정
chmod 400 ~/Downloads/buypilot-key.pem

# SSH 접속 (ELASTIC_IP를 실제 IP로 변경)
ssh -i ~/Downloads/buypilot-key.pem ubuntu@<ELASTIC_IP>

# 예시:
# ssh -i ~/Downloads/buypilot-key.pem ubuntu@52.79.123.45
```

성공하면:
```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 6.2.0-1009-aws x86_64)
...
ubuntu@ip-172-31-xx-xx:~$
```

#### 2. 네이버 Commerce API에 IP 등록

1. **네이버 Commerce API 센터** 접속
2. **애플리케이션 상세** → **API호출 IP** 설정
3. **Elastic IP 주소** 입력: `XX.XX.XX.XX`
4. **"추가"** 버튼 클릭
5. **"저장"** 버튼 클릭

#### 3. Docker 설치 및 애플리케이션 배포

SSH 접속 후:
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 재접속 (docker 그룹 적용)
exit
ssh -i ~/Downloads/buypilot-key.pem ubuntu@<ELASTIC_IP>

# Git 설치 및 레포지토리 클론
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/Noah1206/BuyPilot.git
cd BuyPilot

# 환경 변수 설정 (Railway에서 복사)
nano .env
# ... 환경 변수 입력 후 저장

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 애플리케이션 빌드 및 실행
docker-compose build
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## 💰 비용 안내

### Elastic IP 비용
- **무료**: EC2 인스턴스에 연결되어 **실행 중**일 때
- **유료**: EC2 인스턴스에 연결되지 않았거나 **중지된** 상태일 때
  - 시간당 $0.005 (~월 $3.60)

### 비용 절약 팁
- ✅ Elastic IP를 EC2 인스턴스에 **항상 연결**해두세요
- ✅ 사용하지 않는 Elastic IP는 **즉시 릴리스**하세요
- ❌ EC2 인스턴스를 **중지**하면 Elastic IP 비용 발생
- 💡 개발/테스트 시에만 인스턴스 실행 권장

---

## 🔄 Elastic IP 해제/변경 방법

### Elastic IP 연결 해제
1. EC2 Console → Elastic IP
2. 해제할 IP 선택
3. **작업** → **Elastic IP 주소 연결 해제**
4. **연결 해제** 클릭

### Elastic IP 릴리스 (삭제)
1. EC2 Console → Elastic IP
2. 먼저 **연결 해제** 필수!
3. 릴리스할 IP 선택
4. **작업** → **Elastic IP 주소 릴리스**
5. **릴리스** 클릭

⚠️ **주의**: 릴리스한 IP는 다시 할당받을 수 없습니다!

---

## 🆘 문제 해결

### "Elastic IP 주소를 연결할 수 없습니다"
- **원인**: EC2 인스턴스가 중지되었거나 종료됨
- **해결**: 인스턴스를 시작한 후 다시 시도

### "이미 다른 인스턴스에 연결되어 있습니다"
- **원인**: 하나의 Elastic IP는 하나의 인스턴스에만 연결 가능
- **해결**: 기존 연결을 해제한 후 새 인스턴스에 연결

### "할당 한도 초과"
- **원인**: 리전당 Elastic IP 할당 한도 (기본 5개)
- **해결**: AWS Support에 한도 증가 요청

### SSH 접속 안 됨
```bash
# 키 파일 권한 확인
ls -la ~/Downloads/buypilot-key.pem
# -r-------- 이어야 함

# 권한 재설정
chmod 400 ~/Downloads/buypilot-key.pem

# 보안 그룹 확인
# EC2 Console → 인스턴스 → 보안 탭
# SSH (포트 22)가 "내 IP" 또는 "0.0.0.0/0"으로 열려있는지 확인
```

---

## 📚 추가 자료

- [AWS Elastic IP 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)
- [AWS EC2 시작 가이드](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html)
- [전체 배포 가이드](./AWS_DEPLOYMENT_GUIDE.md)
