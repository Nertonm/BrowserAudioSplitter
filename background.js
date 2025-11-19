// Background service worker for audio routing
class AudioSplitterService {
  constructor() {
    this.audioStreams = new Map(); // tabId -> MediaStream
    this.init();
  }
  
  init() {
    console.log('Browser Audio Splitter service worker initialized');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });
    
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.audible !== undefined) {
        console.log(`Tab ${tabId} audio state changed: ${changeInfo.audible}`);
      }
    });
    
    // Listen for tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.stopCapture(tabId);
    });
  }
  
  async handleMessage(request, sender, sendResponse) {
    console.log('Received message:', request);
    
    try {
      switch (request.action) {
        case 'captureTab':
          await this.captureTabAudio(request.tabId);
          sendResponse({ success: true });
          break;
          
        case 'stopCapture':
          this.stopCapture(request.tabId);
          sendResponse({ success: true });
          break;
          
        case 'getStatus':
          sendResponse({
            success: true,
            activeStreams: Array.from(this.audioStreams.keys())
          });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  async captureTabAudio(tabId) {
    try {
      console.log(`Attempting to capture audio from tab ${tabId}`);
      
      // Check if already capturing
      if (this.audioStreams.has(tabId)) {
        console.log(`Already capturing audio from tab ${tabId}`);
        return;
      }
      
      // Verify tabCapture API exists before calling
      if (!chrome.tabCapture || typeof chrome.tabCapture.capture !== 'function') {
        // tabCapture unavailable (likely Firefox or permission not granted)
        // Open capture.html in a new tab to handle capture in DOM context
        console.log('tabCapture unavailable, opening capture page');
        const captureUrl = chrome.runtime.getURL('capture.html');
        await chrome.tabs.create({ url: captureUrl });
        throw new Error('tabCapture_unavailable');
      }

      // Request permission if needed (for optional_permissions)
      try {
        const hasPermission = await chrome.permissions.contains({ permissions: ['tabCapture'] });
        if (!hasPermission) {
          const granted = await chrome.permissions.request({ permissions: ['tabCapture'] });
          if (!granted) {
            throw new Error('tabCapture permission denied');
          }
        }
      } catch (e) {
        console.warn('Permission check/request failed:', e);
      }

      // Request tab audio capture (wrap callback-style API)
      const stream = await new Promise((resolve, reject) => {
        try {
          chrome.tabCapture.capture({ audio: true, video: false }, (s) => {
            const err = chrome.runtime && chrome.runtime.lastError;
            if (err) return reject(err);
            resolve(s);
          });
        } catch (e) {
          reject(e);
        }
      });
      
      if (!stream) {
        throw new Error('Failed to capture stream');
      }
      
      console.log(`Successfully captured audio from tab ${tabId}`);
      
      // Store the stream (Note: AudioContext not available in service workers)
      this.audioStreams.set(tabId, stream);
      
      // Monitor stream end
      const tracks = stream.getAudioTracks();
      if (tracks && tracks[0]) {
        tracks[0].onended = () => {
          console.log(`Stream ended for tab ${tabId}`);
          this.stopCapture(tabId);
        };
      }
      
    } catch (error) {
      console.error(`Error capturing tab ${tabId}:`, error);
      throw error;
    }
  }
  
  stopCapture(tabId) {
    console.log(`Stopping capture for tab ${tabId}`);
    
    // Stop and remove stream
    if (this.audioStreams.has(tabId)) {
      const stream = this.audioStreams.get(tabId);
      stream.getTracks().forEach(track => track.stop());
      this.audioStreams.delete(tabId);
    }
  }
  
  stopAllCaptures() {
    console.log('Stopping all captures');
    for (const tabId of this.audioStreams.keys()) {
      this.stopCapture(tabId);
    }
  }
}

// Initialize service worker
const audioSplitter = new AudioSplitterService();

// Handle extension lifecycle
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending, cleaning up...');
  audioSplitter.stopAllCaptures();
});
