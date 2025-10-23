# Multi-stage build: Node.js for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy all frontend source files explicitly
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/next.config.js ./next.config.js
COPY frontend/tailwind.config.ts ./tailwind.config.ts
COPY frontend/postcss.config.mjs ./postcss.config.mjs
COPY frontend/.eslintrc.json ./.eslintrc.json
COPY frontend/app ./app
COPY frontend/components ./components
COPY frontend/lib ./lib
COPY frontend/public ./public

# Build Next.js app
RUN npm run build

# Final stage: Python with Node.js and nginx
FROM python:3.11-slim

# Install Node.js and nginx
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    postgresql-client \
    gcc \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend standalone build
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public

# Create nginx config
RUN echo 'server {' > /etc/nginx/sites-available/default && \
    echo '    listen 8080;' >> /etc/nginx/sites-available/default && \
    echo '    location /api/ {' >> /etc/nginx/sites-available/default && \
    echo '        proxy_pass http://127.0.0.1:4070;' >> /etc/nginx/sites-available/default && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/sites-available/default && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '    location /health {' >> /etc/nginx/sites-available/default && \
    echo '        proxy_pass http://127.0.0.1:4070;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '    location / {' >> /etc/nginx/sites-available/default && \
    echo '        proxy_pass http://127.0.0.1:3000;' >> /etc/nginx/sites-available/default && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/sites-available/default && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '}' >> /etc/nginx/sites-available/default

# Create startup script
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'nginx' >> /app/start.sh && \
    echo 'cd /app/frontend && node server.js &' >> /app/start.sh && \
    echo 'cd /app/backend && gunicorn app:app --bind 127.0.0.1:4070 --workers 2 --timeout 120' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 8080
CMD ["/app/start.sh"]
