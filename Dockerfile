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

# Final stage: Python with Node.js and Chrome (for HeySeller scraping)
FROM python:3.11-slim

WORKDIR /app

# Install Chrome and system dependencies for web scraping
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    postgresql-client \
    gcc \
    unzip \
    ca-certificates \
    # Chrome dependencies
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    # Install Node.js
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    # Install Chrome (modern method without apt-key)
    && wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    # Install ChromeDriver (matching Chrome version)
    && CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+') \
    && CHROMEDRIVER_VERSION=$(curl -s "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_${CHROME_VERSION%%.*}") \
    && wget -q -O /tmp/chromedriver-linux64.zip "https://storage.googleapis.com/chrome-for-testing-public/${CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip" \
    && unzip -q /tmp/chromedriver-linux64.zip -d /tmp/ \
    && mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf /tmp/chromedriver* \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Set Chrome environment variables for headless operation
ENV CHROME_BIN=/usr/bin/google-chrome-stable \
    CHROMEDRIVER_PATH=/usr/local/bin/chromedriver

# Copy backend
COPY backend/ /app/backend/
WORKDIR /app/backend

# Upgrade pip first for better download reliability
RUN pip install --upgrade pip

# Install PyTorch CPU-only version first (required by easyocr)
RUN pip install --no-cache-dir --timeout=300 --retries=5 \
    torch==2.1.0 torchvision==0.16.0 --index-url https://download.pytorch.org/whl/cpu

# Install remaining requirements with retry logic, excluding easyocr first
RUN grep -v "easyocr" requirements.txt > /tmp/requirements_temp.txt && \
    pip install --no-cache-dir --timeout=300 --retries=5 -r /tmp/requirements_temp.txt

# Install easyocr separately with --no-deps to prevent torch reinstall
RUN pip install --no-cache-dir --no-deps easyocr==1.7.2 && \
    pip install --no-cache-dir python-bidi PyYAML Pillow scikit-image opencv-python-headless scipy

# Create storage directory for downloaded images
RUN mkdir -p /app/backend/storage/images

# Copy frontend standalone build
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public

# Copy startup script
WORKDIR /app
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8080
CMD ["/app/start.sh"]
