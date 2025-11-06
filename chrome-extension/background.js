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

    // Open welcome page (with error handling)
    setTimeout(() => {
      try {
        chrome.tabs.create({
          url: 'https://buypilot-production.up.railway.app'
        }).catch(err => {
          console.log('ℹ️ Could not open welcome page:', err.message);
        });
      } catch (err) {
        console.log('ℹ️ Could not open welcome page:', err.message);
      }
    }, 1000); // Wait 1 second to avoid timing issues
  } else if (details.reason === 'update') {
    console.log('🔄 BuyPilot Extension updated');
  }
});

// Listen for browser startup - Resume pending imports
chrome.runtime.onStartup.addListener(async () => {
  console.log('🚀 Browser started, checking for pending imports...');

  try {
    const { pendingImport } = await chrome.storage.local.get(['pendingImport']);

    if (pendingImport && pendingImport.productData) {
      console.log('📦 Found pending import, resuming:', pendingImport.productData.title);

      // Add to queue
      importQueue.push(pendingImport);

      // Start processing
      processImportQueue();
    } else {
      console.log('ℹ️ No pending imports found');
    }
  } catch (error) {
    console.error('❌ Error checking pending imports:', error);
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);

  if (request.action === 'importProduct') {
    // Save to storage first (브라우저 종료에 대비)
    chrome.storage.local.set({
      pendingImport: {
        productData: request.data,
        addedAt: Date.now()
      }
    }).then(() => {
      console.log('💾 Product saved to storage for safe processing');
    });

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

    // Start processing queue (don't await - run in background)
    processImportQueue();

    // Response already sent synchronously, no need for return true
    return false;
  }

  if (request.action === 'translate') {
    // Handle translation request
    const { text, from, to } = request;

    console.log(`🌐 Translating: "${text}" from ${from} to ${to}`);

    // Use Google Translate API
    translateText(text, from, to)
      .then(translatedText => {
        console.log(`✅ Translation result: "${translatedText}"`);
        sendResponse({
          success: true,
          translatedText: translatedText
        });
      })
      .catch(error => {
        console.error('❌ Translation error:', error);
        sendResponse({
          success: false,
          translatedText: text, // Fallback to original
          error: error.message
        });
      });

    // Return true to indicate async response
    return true;
  }
});

/**
 * Translate text using Google Translate API
 */
async function translateText(text, from, to) {
  try {
    // Use Google Translate's free API endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract translated text from response
    // Response format: [[[translated, original, null, null, 3]], null, from, ...]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }

    throw new Error('Invalid translation response format');
  } catch (error) {
    console.error('Translation API error:', error);
    // Fallback to original text
    return text;
  }
}

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
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '✅ 상품 가져오기 성공',
          message: `"${item.productData.title.substring(0, 50)}..." 상품이 추가되었습니다.`,
          priority: 2
        });
      } catch (notifError) {
        console.log('ℹ️ Could not show notification:', notifError.message);
      }

      console.log('✅ Import successful');

    } catch (error) {
      console.error('❌ Import failed:', error);

      // Show error notification
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '❌ 상품 가져오기 실패',
          message: `"${item.productData.title.substring(0, 50)}..." 가져오기 실패: ${error.message}`,
          priority: 2
        });
      } catch (notifError) {
        console.log('ℹ️ Could not show notification:', notifError.message);
      }
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
    // If productData is null/undefined, try to load from storage (브라우저 종료 후 재시작 시)
    if (!productData || !productData.taobao_item_id) {
      console.log('📦 Product data not provided, loading from storage...');
      const storageData = await chrome.storage.local.get(['currentProduct']);
      if (storageData.currentProduct) {
        productData = storageData.currentProduct;
        console.log('✅ Loaded product from storage:', productData.title);
      } else {
        throw new Error('No product data available in storage');
      }
    }

    const { backendUrl } = await chrome.storage.sync.get(['backendUrl']);
    const apiUrl = `${backendUrl || 'https://buypilot-production.up.railway.app'}/api/v1/products/import-from-extension`;

    console.log(`📡 Sending to backend: ${apiUrl}`);

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

    // Clear storage after successful import (both currentProduct and pendingImport)
    await chrome.storage.local.remove(['currentProduct', 'pendingImport']);
    console.log('🗑️  Cleared product from storage after successful import');

    return result;

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
}
