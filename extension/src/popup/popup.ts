/**
 * BuyPilot Shopping Analyzer - Popup Script
 * Extension settings and controls
 */

console.log('🎨 BuyPilot Popup loaded');

interface Settings {
  apiBaseUrl: string;
  enabled: boolean;
  autoRefresh: boolean;
}

// Load current settings
function loadSettings(): void {
  chrome.storage.sync.get(['apiBaseUrl', 'enabled', 'autoRefresh'], (items: { [key: string]: any }) => {
    const settings = items as Settings;
    const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
    const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
    const autoRefreshCheckbox = document.getElementById('autoRefresh') as HTMLInputElement;

    if (apiUrlInput) apiUrlInput.value = settings.apiBaseUrl || 'http://localhost:5001';
    if (enabledCheckbox) enabledCheckbox.checked = settings.enabled !== false;
    if (autoRefreshCheckbox) autoRefreshCheckbox.checked = settings.autoRefresh === true;
  });
}

// Save settings
function saveSettings(): void {
  const apiUrl = (document.getElementById('apiUrl') as HTMLInputElement).value;
  const enabled = (document.getElementById('enabled') as HTMLInputElement).checked;
  const autoRefresh = (document.getElementById('autoRefresh') as HTMLInputElement).checked;

  chrome.storage.sync.set({
    apiBaseUrl: apiUrl,
    enabled,
    autoRefresh
  }, () => {
    // Show success message
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '✅ 설정이 저장되었습니다';
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // Test connection button
  const testBtn = document.getElementById('testBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const apiUrl = (document.getElementById('apiUrl') as HTMLInputElement).value;
      const status = document.getElementById('status');

      if (status) {
        status.textContent = '🔍 연결 테스트 중...';
        status.style.display = 'block';
      }

      try {
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          if (status) {
            status.textContent = '✅ API 서버 연결 성공';
            status.className = 'status success';
          }
        } else {
          throw new Error('Server responded with error');
        }
      } catch (error) {
        if (status) {
          status.textContent = '❌ API 서버 연결 실패';
          status.className = 'status error';
        }
      }
    });
  }
});
