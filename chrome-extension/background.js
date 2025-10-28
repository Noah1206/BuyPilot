/**
 * Background Service Worker
 * Handles extension lifecycle and background tasks
 */

console.log('🚀 BuyPilot Extension: Background service worker started');

// Import queue
const importQueue = [];
let isProcessingQueue = false;

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('📌 Extension icon clicked on tab:', tab.url);
});

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ BuyPilot Extension installed');

    // Set default backend URL
    chrome.storage.sync.set({
      backendUrl: 'https://buypilot-production.up.railway.app'
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://buypilot-production.up.railway.app'
    });
  } else if (details.reason === 'update') {
    console.log('🔄 BuyPilot Extension updated');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);

  if (request.action === 'importProduct') {
    // Add to queue and process in background
    importQueue.push({
      productData: request.data,
      addedAt: Date.now()
    });

    // Send immediate response
    sendResponse({
      success: true,
      queued: true,
      message: '상품이 대기열에 추가되었습니다. 백그라운드에서 처리됩니다.'
    });

    // Start processing queue
    processImportQueue();

    return true;
  }
});

/**
 * Process import queue
 */
async function processImportQueue() {
  if (isProcessingQueue || importQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (importQueue.length > 0) {
    const item = importQueue.shift();

    try {
      console.log('📦 Processing product import:', item.productData.title);

      const result = await handleProductImport(item.productData);

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '✅ 상품 가져오기 성공',
        message: `"${item.productData.title.substring(0, 50)}..." 상품이 추가되었습니다.`,
        priority: 2
      });

      console.log('✅ Import successful');

    } catch (error) {
      console.error('❌ Import failed:', error);

      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '❌ 상품 가져오기 실패',
        message: `"${item.productData.title.substring(0, 50)}..." 가져오기 실패: ${error.message}`,
        priority: 2
      });
    }

    // Small delay between imports
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  isProcessingQueue = false;
}

/**
 * Handle product import
 */
async function handleProductImport(productData) {
  try {
    const { backendUrl } = await chrome.storage.sync.get(['backendUrl']);
    const apiUrl = `${backendUrl || 'https://buypilot-production.up.railway.app'}/api/v1/products/import-from-extension`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
}
