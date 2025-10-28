/**
 * BuyPilot Shopping Analyzer - Background Service Worker
 * Handles extension lifecycle and API communication
 */

console.log('🔧 BuyPilot Background Service Worker initialized');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ Extension installed');
    // Set default settings
    chrome.storage.sync.set({
      apiBaseUrl: 'http://localhost:5001',
      enabled: true,
      autoRefresh: false
    });
  } else if (details.reason === 'update') {
    console.log('🔄 Extension updated');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiBaseUrl', 'enabled', 'autoRefresh'], (settings) => {
      sendResponse(settings);
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
});

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('🔌 Port connected:', port.name);
});

export {};
