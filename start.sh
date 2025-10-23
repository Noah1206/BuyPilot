#!/bin/bash
set -e

echo "Starting Next.js on port 3000..."
cd /app/frontend && PORT=3000 HOSTNAME=0.0.0.0 node server.js &
NEXTJS_PID=$!
echo "Next.js started with PID $NEXTJS_PID"

# Wait longer for Next.js to be ready
sleep 5

# Test if Next.js is responding
echo "Testing Next.js connection..."
curl -f http://localhost:3000 > /dev/null 2>&1 && echo "Next.js is responding!" || echo "Warning: Next.js may not be ready yet"

echo "Starting Flask on port 8080..."
cd /app/backend && exec gunicorn app:app --bind 0.0.0.0:8080 --workers 2 --timeout 120
