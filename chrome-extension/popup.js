/**
 * Popup Script - Handles UI and backend communication
 */

// Default backend URL
const DEFAULT_BACKEND_URL = 'https://buypilot-production.up.railway.app';
const LOCAL_BACKEND_URL = 'http://localhost:8080';

// DOM Elements
const statusEl = document.getElementById('status');
const productPreviewEl = document.getElementById('productPreview');
const productImageEl = document.getElementById('productImage');
const productTitleEl = document.getElementById('productTitle');
const productPriceEl = document.getElementById('productPrice');
const productIdEl = document.getElementById('productId');
const importBtn = document.getElementById('importBtn');
const refreshBtn = document.getElementById('refreshBtn');
const backendUrlInput = document.getElementById('backendUrl');
const openDashboardLink = document.getElementById('openDashboard');

let currentProduct = null;

/**
 * Initialize popup
 */
async function init() {
  console.log('🚀 Popup initialized');

  // Load backend URL from storage
  const { backendUrl } = await chrome.storage.sync.get(['backendUrl']);
  backendUrlInput.value = backendUrl || DEFAULT_BACKEND_URL;

  // Save backend URL on change
  backendUrlInput.addEventListener('change', async () => {
    await chrome.storage.sync.set({ backendUrl: backendUrlInput.value });
    showStatus('설정이 저장되었습니다', 'success');
  });

  // Load product data
  await loadProductData();

  // Button listeners
  importBtn.addEventListener('click', importProduct);
  refreshBtn.addEventListener('click', loadProductData);
  openDashboardLink.addEventListener('click', openDashboard);
}

/**
 * Load product data from current tab
 */
async function loadProductData() {
  try {
    showStatus('상품 정보를 가져오는 중...', 'loading');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if on Taobao/Tmall
    if (!tab.url.includes('taobao.com') && !tab.url.includes('tmall.com')) {
      showStatus('Taobao 또는 Tmall 상품 페이지에서 실행해주세요', 'error');
      importBtn.disabled = true;
      return;
    }

    // Request product data from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractProduct' });

    if (response.success && response.data) {
      currentProduct = response.data;
      displayProduct(currentProduct);
      showStatus('상품 정보를 불러왔습니다', 'success');
      importBtn.disabled = false;
    } else {
      showStatus('상품 정보를 찾을 수 없습니다', 'error');
      importBtn.disabled = true;
    }

  } catch (error) {
    console.error('Error loading product:', error);
    showStatus('상품 정보를 불러오는데 실패했습니다', 'error');
    importBtn.disabled = true;
  }
}

/**
 * Display product in preview
 */
function displayProduct(product) {
  productPreviewEl.classList.remove('hidden');

  productImageEl.src = product.pic_url || product.images[0] || '';
  productTitleEl.textContent = product.title || '제목 없음';
  productPriceEl.textContent = `¥${product.price || 0}`;
  productIdEl.textContent = `ID: ${product.taobao_item_id}`;
}

/**
 * Import product to BuyPilot (via background worker)
 */
async function importProduct() {
  if (!currentProduct) {
    showStatus('상품 정보가 없습니다', 'error');
    return;
  }

  try {
    importBtn.disabled = true;
    showStatus('상품을 대기열에 추가하는 중...', 'loading');
    importBtn.innerHTML = '<span class="loading-spinner"></span>추가 중...';

    // Send to background worker for processing
    const response = await chrome.runtime.sendMessage({
      action: 'importProduct',
      data: currentProduct
    });

    if (response.success && response.queued) {
      showStatus('✅ 백그라운드에서 처리됩니다!', 'success');
      importBtn.innerHTML = '✅ 대기열 추가 완료';

      // Reset button after 2 seconds
      setTimeout(() => {
        importBtn.innerHTML = '상품 가져오기';
        importBtn.disabled = false;
      }, 2000);

      // Show instruction
      setTimeout(() => {
        showStatus('익스텐션을 닫아도 작업이 계속됩니다. 완료되면 알림이 표시됩니다.', 'success');
      }, 2500);

    } else {
      throw new Error('대기열 추가 실패');
    }

  } catch (error) {
    console.error('Import error:', error);
    showStatus(`❌ 오류: ${error.message}`, 'error');
    importBtn.innerHTML = '상품 가져오기';
    importBtn.disabled = false;
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'idle') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

/**
 * Open BuyPilot dashboard
 */
async function openDashboard(e) {
  e.preventDefault();
  const backendUrl = backendUrlInput.value || DEFAULT_BACKEND_URL;
  const dashboardUrl = backendUrl.replace(':8080', ':3001') + '/products';
  chrome.tabs.create({ url: dashboardUrl });
}

// Initialize on load
init();
