// Background service worker for audio routing
class AudioSplitterService {
  constructor() {
    this.audioStreams = new Map(); // tabId -> MediaStream
    this.audioContexts = new Map(); // tabId -> AudioContext
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
      
      // Request tab audio capture
      const stream = await chrome.tabCapture.capture({
        audio: true,
        video: false
      });
      
      if (!stream) {
        throw new Error('Failed to capture stream');
      }
      
      console.log(`Successfully captured audio from tab ${tabId}`);
      
      // Store the stream
      this.audioStreams.set(tabId, stream);
      
      // Create audio context for processing
      const audioContext = new AudioContext();
      this.audioContexts.set(tabId, audioContext);
      
      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // For now, just connect to destination (default output)
      // In a full implementation, this would route to selected output
      source.connect(audioContext.destination);
      
      // Monitor stream end
      stream.getAudioTracks()[0].onended = () => {
        console.log(`Stream ended for tab ${tabId}`);
        this.stopCapture(tabId);
      };
      
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
    
    // Close and remove audio context
    if (this.audioContexts.has(tabId)) {
      const context = this.audioContexts.get(tabId);
      context.close();
      this.audioContexts.delete(tabId);
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
