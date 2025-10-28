/**
 * Background Service Worker
 * Handles extension lifecycle and background tasks
 */

console.log('🚀 BuyPilot Extension: Background service worker started');

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
    // Handle product import in background
    handleProductImport(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep message channel open for async response
  }
});

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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
}
