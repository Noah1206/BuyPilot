# Multi-stage build: Build frontend, serve both
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies and build
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/tsconfig.json ./
COPY frontend/next.config.js ./
COPY frontend/tailwind.config.ts ./
COPY frontend/postcss.config.js ./
COPY frontend/next-env.d.ts ./
COPY frontend/app ./app
COPY frontend/components ./components
COPY frontend/lib ./lib
COPY frontend/public ./public

# Build Next.js standalone
RUN npm run build

# Final stage: Python with Node.js
FROM python:3.11-slim

WORKDIR /app

# Install Node.js and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    gcc \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend standalone build
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public

# Create simple startup script
WORKDIR /app
RUN printf '#!/bin/bash\n\
set -e\n\
echo "Starting Next.js..."\n\
cd /app/frontend && PORT=3000 node server.js &\n\
NEXTJS_PID=$!\n\
echo "Next.js started with PID $NEXTJS_PID"\n\
\n\
sleep 2\n\
\n\
echo "Starting Flask..."\n\
cd /app/backend && exec gunicorn app:app --bind 0.0.0.0:8080 --workers 2 --timeout 120\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8080
CMD ["/app/start.sh"]
