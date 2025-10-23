#!/bin/bash
set -e

echo "Starting Next.js on port 3000..."
cd /app/frontend && PORT=3000 node server.js &
NEXTJS_PID=$!
echo "Next.js started with PID $NEXTJS_PID"

sleep 2

echo "Starting Flask on port 8080..."
cd /app/backend && exec gunicorn app:app --bind 0.0.0.0:8080 --workers 2 --timeout 120
