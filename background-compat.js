// background-compat.js - compatibility background script for Firefox (background page).
(function () {
  if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
    window.browser = chrome;
  }

  class AudioSplitterBackgroundCompat {
    constructor() {
      this.capturingWindows = new Map(); // tabId -> windowId
      this.init();
    }

    init() {
      console.log('Audio Splitter background (compat) initialized');

      browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        (async () => {
          try {
            if (request.action === 'captureTab') {
              const tabId = request.tabId;
              try {
                if (browser.permissions && browser.permissions.request) {
                  await browser.permissions.request({ permissions: ['tabCapture'] }).catch(()=>false);
                }
              } catch (permErr) {
                console.warn('Permission request for tabCapture may be unsupported or denied', permErr);
              }

              // If tabCapture exists here, open capture page that will run tabCapture
              if ((browser.tabCapture && typeof browser.tabCapture.capture === 'function') ||
                  (typeof chrome !== 'undefined' && chrome.tabCapture && typeof chrome.tabCapture.capture === 'function')) {
                const url = browser.runtime.getURL(`capture.html?tabId=${encodeURIComponent(tabId)}`);
                try {
                  const win = await browser.windows.create({ url, type: 'popup', height: 260, width: 360 });
                  if (win && win.id) this.capturingWindows.set(String(tabId), win.id);
                  sendResponse({ success: true });
                  return;
                } catch (e) {
                  console.warn('Opening capture window failed:', e);
                }
              }

              // If tabCapture not available here, inform caller to fallback (getDisplayMedia)
              sendResponse({ success: false, error: 'tabCapture_unavailable' });
              return;
            }

            if (request.action === 'stopCapture') {
              const tabId = request.tabId;
              const winId = this.capturingWindows.get(String(tabId));
              if (winId !== undefined) {
                try { await browser.windows.remove(winId); } catch(e) {}
                this.capturingWindows.delete(String(tabId));
              }
              sendResponse({ success: true });
              return;
            }

            if (request.action === 'fallbackCaptureStarted') {
              sendResponse({ success: true });
              return;
            }

            sendResponse({ success: false, error: 'unknown_action' });
          } catch (err) {
            console.error('Background (compat) handler error', err);
            sendResponse({ success: false, error: err && err.message ? err.message : String(err) });
          }
        })();
        return true;
      });
    }
  }

  new AudioSplitterBackgroundCompat();

})();