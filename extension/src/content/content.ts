/**
 * BuyPilot Shopping Analyzer - Content Script
 * Injects analyzer panel into Naver Shopping search results page
 */

console.log('🚀 BuyPilot Shopping Analyzer loaded');

// Configuration
const API_BASE_URL = 'http://localhost:5001'; // Extension API backend
const PANEL_ID = 'buypilot-analyzer-panel';

// Types
interface SearchQuery {
  keyword: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface AnalysisData {
  searchVolume: {
    monthly: number;
    pc: number;
    mobile: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
  estimatedRevenue: {
    monthly: number;
    clickRate: number;
    conversionRate: number;
    avgPrice: number;
  };
  priceDistribution: {
    ranges: string[];
    counts: number[];
  };
  competition: {
    score: number;
    level: 'low' | 'medium' | 'high';
    recent1Month: number;
    expected1Month: number;
    expected3Month: number;
  };
}

/**
 * Extract search query from Naver Shopping URL
 */
function extractSearchQuery(): SearchQuery | null {
  const url = new URL(window.location.href);
  const keyword = url.searchParams.get('query') || url.searchParams.get('q');

  if (!keyword) {
    console.warn('⚠️ No search keyword found in URL');
    return null;
  }

  return {
    keyword,
    categoryId: url.searchParams.get('cat_id') || undefined,
    minPrice: parseInt(url.searchParams.get('minPrice') || '0') || undefined,
    maxPrice: parseInt(url.searchParams.get('maxPrice') || '0') || undefined
  };
}

/**
 * Find insertion point for analyzer panel
 * Should be placed right above product list, below filters
 */
function findInsertionPoint(): Element | null {
  // Try multiple selectors for Naver Shopping page structure
  const selectors = [
    '.basicList_list_basis__uNBZx',  // Product list container
    '.product_list',                  // Alternative product list
    '#content .section',              // Main content section
    '.search_list'                    // Search results list
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ Found insertion point: ${selector}`);
      return element;
    }
  }

  console.warn('⚠️ Could not find suitable insertion point');
  return null;
}

/**
 * Create analyzer panel HTML structure
 */
function createAnalyzerPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'buypilot-analyzer-panel';

  panel.innerHTML = `
    <div class="buypilot-panel-header">
      <div class="buypilot-panel-title">
        <span class="buypilot-icon">🔍</span>
        <span>BuyPilot 상품 분석</span>
      </div>
      <div class="buypilot-panel-controls">
        <button class="buypilot-refresh-btn" title="새로고침">🔄</button>
        <button class="buypilot-minimize-btn" title="최소화">▼</button>
      </div>
    </div>

    <div class="buypilot-panel-body">
      <div class="buypilot-loading">
        <div class="buypilot-spinner"></div>
        <p>분석 데이터를 불러오는 중...</p>
      </div>

      <div class="buypilot-cards-container" style="display: none;">
        <!-- Search Volume Card -->
        <div class="buypilot-card">
          <h3 class="buypilot-card-title">검색량</h3>
          <div class="buypilot-card-content">
            <div class="buypilot-main-metric">
              <span class="buypilot-metric-value" id="search-volume-total">-</span>
              <span class="buypilot-metric-label">건/월</span>
            </div>
            <div class="buypilot-sub-metrics">
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">PC</span>
                <span class="buypilot-value" id="search-volume-pc">-</span>
              </div>
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">모바일</span>
                <span class="buypilot-value" id="search-volume-mobile">-</span>
              </div>
            </div>
            <div class="buypilot-trend" id="search-volume-trend">
              <span class="buypilot-trend-icon">↑</span>
              <span class="buypilot-trend-text">전월 대비 -</span>
            </div>
          </div>
        </div>

        <!-- Estimated Revenue Card -->
        <div class="buypilot-card">
          <h3 class="buypilot-card-title">예상 월 매출액</h3>
          <div class="buypilot-card-content">
            <div class="buypilot-main-metric">
              <span class="buypilot-metric-value" id="revenue-total">-</span>
              <span class="buypilot-metric-label">원</span>
            </div>
            <div class="buypilot-sub-metrics">
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">클릭률</span>
                <span class="buypilot-value" id="revenue-click-rate">-</span>
              </div>
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">전환율</span>
                <span class="buypilot-value" id="revenue-conversion-rate">-</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Price Distribution Card -->
        <div class="buypilot-card">
          <h3 class="buypilot-card-title">가격 분포</h3>
          <div class="buypilot-card-content">
            <canvas id="price-distribution-chart" width="200" height="120"></canvas>
          </div>
        </div>

        <!-- Competition Score Card -->
        <div class="buypilot-card">
          <h3 class="buypilot-card-title">경쟁 강도</h3>
          <div class="buypilot-card-content">
            <div class="buypilot-main-metric">
              <span class="buypilot-metric-value" id="competition-score">-</span>
              <span class="buypilot-metric-label">점</span>
            </div>
            <div class="buypilot-competition-bar">
              <div class="buypilot-competition-fill" id="competition-bar" style="width: 0%"></div>
            </div>
            <div class="buypilot-sub-metrics">
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">최근 1달</span>
                <span class="buypilot-value" id="competition-recent">-</span>
              </div>
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">예상 1달</span>
                <span class="buypilot-value" id="competition-expected1">-</span>
              </div>
              <div class="buypilot-sub-metric">
                <span class="buypilot-label">예상 3달</span>
                <span class="buypilot-value" id="competition-expected3">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="buypilot-error" style="display: none;">
        <p class="buypilot-error-message" id="error-message"></p>
        <button class="buypilot-retry-btn">다시 시도</button>
      </div>
    </div>
  `;

  return panel;
}

/**
 * Fetch analysis data from backend API
 */
async function fetchAnalysisData(query: SearchQuery): Promise<AnalysisData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('❌ Failed to fetch analysis data:', error);
    throw error;
  }
}

/**
 * Update panel UI with analysis data
 */
function updatePanelUI(data: AnalysisData): void {
  // Search Volume
  document.getElementById('search-volume-total')!.textContent =
    data.searchVolume.monthly.toLocaleString();
  document.getElementById('search-volume-pc')!.textContent =
    `${data.searchVolume.pc.toLocaleString()} (${Math.round(data.searchVolume.pc / data.searchVolume.monthly * 100)}%)`;
  document.getElementById('search-volume-mobile')!.textContent =
    `${data.searchVolume.mobile.toLocaleString()} (${Math.round(data.searchVolume.mobile / data.searchVolume.monthly * 100)}%)`;

  const trendEl = document.getElementById('search-volume-trend')!;
  const trendIcon = data.searchVolume.trend === 'up' ? '↑' : data.searchVolume.trend === 'down' ? '↓' : '→';
  trendEl.innerHTML = `
    <span class="buypilot-trend-icon ${data.searchVolume.trend}">${trendIcon}</span>
    <span class="buypilot-trend-text">전월 대비 ${Math.abs(data.searchVolume.changePercent)}%</span>
  `;

  // Estimated Revenue
  document.getElementById('revenue-total')!.textContent =
    (data.estimatedRevenue.monthly / 100000000).toFixed(1) + '억';
  document.getElementById('revenue-click-rate')!.textContent =
    (data.estimatedRevenue.clickRate * 100).toFixed(1) + '%';
  document.getElementById('revenue-conversion-rate')!.textContent =
    (data.estimatedRevenue.conversionRate * 100).toFixed(1) + '%';

  // Price Distribution Chart (will implement with Chart.js)
  renderPriceChart(data.priceDistribution);

  // Competition Score
  document.getElementById('competition-score')!.textContent = data.competition.score.toString();
  document.getElementById('competition-bar')!.style.width = `${data.competition.score}%`;
  document.getElementById('competition-recent')!.textContent = data.competition.recent1Month.toFixed(2);
  document.getElementById('competition-expected1')!.textContent = data.competition.expected1Month.toFixed(2);
  document.getElementById('competition-expected3')!.textContent = data.competition.expected3Month.toFixed(2);

  // Show cards, hide loading
  const loading = document.querySelector('.buypilot-loading') as HTMLElement;
  const cards = document.querySelector('.buypilot-cards-container') as HTMLElement;
  loading.style.display = 'none';
  cards.style.display = 'grid';
}

/**
 * Render price distribution chart
 */
function renderPriceChart(distribution: { ranges: string[]; counts: number[] }): void {
  // Placeholder for Chart.js implementation
  console.log('📊 Price chart data:', distribution);
  // Will implement in next step with Chart.js
}

/**
 * Show error in panel
 */
function showError(message: string): void {
  const loading = document.querySelector('.buypilot-loading') as HTMLElement;
  const cards = document.querySelector('.buypilot-cards-container') as HTMLElement;
  const error = document.querySelector('.buypilot-error') as HTMLElement;
  const errorMessage = document.getElementById('error-message') as HTMLElement;

  loading.style.display = 'none';
  cards.style.display = 'none';
  error.style.display = 'block';
  errorMessage.textContent = message;
}

/**
 * Initialize analyzer panel
 */
async function initAnalyzerPanel(): Promise<void> {
  // Check if already injected
  if (document.getElementById(PANEL_ID)) {
    console.log('ℹ️ Analyzer panel already exists');
    return;
  }

  // Extract search query
  const query = extractSearchQuery();
  if (!query) {
    console.warn('⚠️ Cannot initialize analyzer: no search query');
    return;
  }

  console.log('🔍 Search query:', query);

  // Find insertion point
  const insertionPoint = findInsertionPoint();
  if (!insertionPoint) {
    console.error('❌ Cannot find insertion point');
    return;
  }

  // Create and inject panel
  const panel = createAnalyzerPanel();
  insertionPoint.parentElement!.insertBefore(panel, insertionPoint);
  console.log('✅ Analyzer panel injected');

  // Setup event listeners
  setupEventListeners(query);

  // Fetch and display analysis data
  try {
    const data = await fetchAnalysisData(query);
    updatePanelUI(data);
  } catch (error) {
    showError('분석 데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * Setup event listeners for panel controls
 */
function setupEventListeners(query: SearchQuery): void {
  // Minimize button
  document.querySelector('.buypilot-minimize-btn')?.addEventListener('click', () => {
    const body = document.querySelector('.buypilot-panel-body') as HTMLElement;
    const btn = document.querySelector('.buypilot-minimize-btn') as HTMLElement;

    if (body.style.display === 'none') {
      body.style.display = 'block';
      btn.textContent = '▼';
      btn.title = '최소화';
    } else {
      body.style.display = 'none';
      btn.textContent = '▲';
      btn.title = '펼치기';
    }
  });

  // Refresh button
  document.querySelector('.buypilot-refresh-btn')?.addEventListener('click', async () => {
    const loading = document.querySelector('.buypilot-loading') as HTMLElement;
    const cards = document.querySelector('.buypilot-cards-container') as HTMLElement;
    const error = document.querySelector('.buypilot-error') as HTMLElement;

    loading.style.display = 'flex';
    cards.style.display = 'none';
    error.style.display = 'none';

    try {
      const data = await fetchAnalysisData(query);
      updatePanelUI(data);
    } catch (err) {
      showError('분석 데이터를 불러오는데 실패했습니다.');
    }
  });

  // Retry button
  document.querySelector('.buypilot-retry-btn')?.addEventListener('click', async () => {
    const error = document.querySelector('.buypilot-error') as HTMLElement;
    const loading = document.querySelector('.buypilot-loading') as HTMLElement;

    error.style.display = 'none';
    loading.style.display = 'flex';

    try {
      const data = await fetchAnalysisData(query);
      updatePanelUI(data);
    } catch (err) {
      showError('분석 데이터를 불러오는데 실패했습니다.');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalyzerPanel);
} else {
  initAnalyzerPanel();
}

// Re-initialize on URL changes (for SPA navigation)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('🔄 URL changed, re-initializing analyzer');
    // Remove old panel
    document.getElementById(PANEL_ID)?.remove();
    // Re-initialize
    setTimeout(initAnalyzerPanel, 1000);
  }
}).observe(document.body, { childList: true, subtree: true });
