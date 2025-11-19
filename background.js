// background.js - coordinator only (no AudioContext)
try { importScripts('browser-shim.js'); } catch (e) { /* importScripts may not be available in some contexts */ }

class AudioSplitterBackground {
	constructor() {
		this.capturingWindows = new Map(); // tabId -> windowId
		this.init();
	}

	init() {
		console.log('Audio Splitter background initialized');

		browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
				(async () => {
				try {
						console.log('Background received message:', request, 'from', sender && sender.tab ? sender.tab.id : sender);
					if (request.action === 'captureTab') {
						const tabId = request.tabId;
						try {
							if (browser.permissions && browser.permissions.request) {
								await browser.permissions.request({ permissions: ['tabCapture'] }).catch(() => false);
							}

							if (request.action === 'captureStarted') {
								console.log('Background: captureStarted reported from page', request);
								sendResponse({ success: true });
								return;
							}

							if (request.action === 'reportError') {
								// store recent errors for debugging
								try {
									console.error('Reported capture error:', request);
									const key = 'captureErrors';
									let list = [];
									if (browser && browser.storage && browser.storage.local) {
										const data = await browser.storage.local.get(key);
										list = (data && data[key]) || [];
										list.unshift(request);
										if (list.length > 50) list = list.slice(0, 50);
										await browser.storage.local.set({ [key]: list });
									} else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
										chrome.storage.local.get(key, (data) => {
											const prev = (data && data[key]) || [];
											prev.unshift(request);
											const trimmed = prev.slice(0, 50);
											chrome.storage.local.set({ [key]: trimmed });
										});
									}
								} catch (e) {
									console.warn('Error storing reported error', e);
								}
								sendResponse({ success: true });
								return;
							}
						} catch (permErr) {
							console.warn('Permission request for tabCapture may be unsupported or denied', permErr);
						}

						if ((browser.tabCapture && typeof browser.tabCapture.capture === 'function') || (typeof chrome !== 'undefined' && chrome.tabCapture && typeof chrome.tabCapture.capture === 'function')) {
							const url = browser.runtime.getURL(`capture.html?tabId=${encodeURIComponent(tabId)}`);
							try {
								const win = await browser.windows.create({ url, type: 'popup', height: 360, width: 560 });
								if (win && win.id) this.capturingWindows.set(String(tabId), win.id);
								sendResponse({ success: true });
								return;
							} catch (e) {
								console.warn('Opening capture window failed:', e);
							}
						}

						sendResponse({ success: false, error: 'tabCapture_unavailable' });
						return;
					}

					if (request.action === 'stopCapture') {
						const tabId = request.tabId;
						const winId = this.capturingWindows.get(String(tabId));
						if (winId !== undefined) {
							try { await browser.windows.remove(winId); } catch (e) { }
							this.capturingWindows.delete(String(tabId));
						}
						sendResponse({ success: true });
						return;
					}

					if (request.action === 'fallbackCaptureStarted') {
									console.log('Background: fallback capture started (reported from capture page).');
									sendResponse({ success: true });
						return;
					}

					sendResponse({ success: false, error: 'unknown_action' });
				} catch (err) {
					console.error('Background handler error', err);
					sendResponse({ success: false, error: err && err.message ? err.message : String(err) });
				}
			})();
			return true; // keep channel open for async response
		});
	}
}

const audioSplitter = new AudioSplitterBackground();

if (browser && browser.runtime && browser.runtime.onSuspend && browser.runtime.onSuspend.addListener) {
	browser.runtime.onSuspend.addListener(() => {
		console.log('Service worker suspending; cleanup may be needed.');
	});
}
