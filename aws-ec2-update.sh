#!/bin/bash
# AWS EC2 코드 업데이트 스크립트

echo "🔄 AWS EC2 코드 업데이트 시작..."
echo ""

# 1. 최신 코드 가져오기
echo "📥 Step 1/5: Git pull..."
cd /home/ec2-user/BuyPilot
git pull origin main

# 2. 기존 컨테이너 중지
echo "🛑 Step 2/5: Stopping container..."
docker stop buypilot-app 2>/dev/null || echo "Container not running"

# 3. 기존 컨테이너 제거
echo "🗑️  Step 3/5: Removing container..."
docker rm buypilot-app 2>/dev/null || echo "Container not found"

# 4. 새 이미지 빌드
echo "🏗️  Step 4/5: Building new image..."
docker build -t buypilot-app .

# 5. 새 컨테이너 실행
echo "🚀 Step 5/5: Starting new container..."
docker run -d \
  --name buypilot-app \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  -v $(pwd)/backend/storage:/app/backend/storage \
  buypilot-app

# 6. 상태 확인
echo ""
echo "✅ 업데이트 완료! 컨테이너 상태:"
docker ps | grep buypilot-app

echo ""
echo "📋 최근 로그 (5초 대기 후):"
sleep 5
docker logs --tail 20 buypilot-app

echo ""
echo "🎉 완료! Health check:"
curl -s http://localhost:8080/health
echo ""
