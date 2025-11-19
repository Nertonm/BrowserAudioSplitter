// Popup UI controller
class AudioSplitterPopup {
  constructor() {
    this.tabsList = document.getElementById('tabs-list');
    this.outputsList = document.getElementById('outputs-list');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.optionsBtn = document.getElementById('options-btn');
    
    this.init();
  }
  
  async init() {
    this.attachEventListeners();
    await this.loadTabs();
    await this.loadOutputs();
  }
  
  attachEventListeners() {
    this.refreshBtn.addEventListener('click', () => this.refresh());
    this.optionsBtn.addEventListener('click', () => this.openOptions());
  }
  
  async loadTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const audioTabs = tabs.filter(tab => {
        if (tab.audible) return true;
        try {
          const url = new URL(tab.url);
          return url.hostname === 'youtube.com' || 
                 url.hostname === 'www.youtube.com' || 
                 url.hostname === 'spotify.com' ||
                 url.hostname === 'www.spotify.com';
        } catch {
          return false;
        }
      });
      
      if (audioTabs.length === 0) {
        this.tabsList.innerHTML = '<p class="empty-state">No audio tabs detected</p>';
        return;
      }
      
      this.tabsList.innerHTML = '';
      
      for (const tab of audioTabs) {
        const tabItem = this.createTabItem(tab);
        this.tabsList.appendChild(tabItem);
      }
    } catch (error) {
      console.error('Error loading tabs:', error);
      this.tabsList.innerHTML = '<p class="empty-state">Error loading tabs</p>';
    }
  }
  
  createTabItem(tab) {
    const item = document.createElement('div');
    item.className = 'tab-item';
    
    const info = document.createElement('div');
    info.className = 'tab-info';
    
    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || 'Untitled';
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${tab.audible ? 'status-active' : 'status-inactive'}`;
    statusBadge.textContent = tab.audible ? 'Playing' : 'Idle';
    title.appendChild(statusBadge);
    
    const url = document.createElement('div');
    url.className = 'tab-url';
    try {
      const urlObj = new URL(tab.url);
      url.textContent = urlObj.hostname;
    } catch {
      url.textContent = 'Unknown URL';
    }
    
    info.appendChild(title);
    info.appendChild(url);
    
    const actions = document.createElement('div');
    actions.className = 'tab-actions';
    
    const captureBtn = document.createElement('button');
    captureBtn.className = 'btn-small btn-capture';
    captureBtn.textContent = 'Capture';
    captureBtn.addEventListener('click', () => this.captureTab(tab.id));
    
    actions.appendChild(captureBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
  }
  
  async loadOutputs() {
    try {
      // Note: Direct audio output selection is limited in browsers
      // This simulates the UI - actual implementation would require native messaging
      this.outputsList.innerHTML = '';
      
      const defaultOutput = this.createOutputItem({
        id: 'default',
        label: 'Default Audio Output',
        deviceId: 'default'
      });
      
      this.outputsList.appendChild(defaultOutput);
      
      // Show informational message
      const info = document.createElement('p');
      info.className = 'info';
      info.style.marginTop = '10px';
      info.textContent = 'Note: Browser limitations may restrict output device selection. Consider using system audio settings.';
      this.outputsList.appendChild(info);
      
    } catch (error) {
      console.error('Error loading outputs:', error);
      this.outputsList.innerHTML = '<p class="empty-state">Error loading audio devices</p>';
    }
  }
  
  createOutputItem(output) {
    const item = document.createElement('div');
    item.className = 'output-item';
    
    const info = document.createElement('div');
    info.className = 'output-info';
    
    const label = document.createElement('div');
    label.className = 'output-label';
    label.textContent = output.label;
    
    const device = document.createElement('div');
    device.className = 'output-device';
    device.textContent = `Device ID: ${output.deviceId}`;
    
    info.appendChild(label);
    info.appendChild(device);
    
    const actions = document.createElement('div');
    actions.className = 'output-actions';
    
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn-small btn-select';
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('click', () => this.selectOutput(output.deviceId));
    
    actions.appendChild(selectBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
  }
  
  async captureTab(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'captureTab',
        tabId: tabId
      });
      
      if (response && response.success) {
        alert('Audio capture started for tab');
        await this.refresh();
      } else {
        const err = response && response.error ? response.error : 'Unknown error';
        // If tabCapture is unavailable, open capture.html so user can use the fallback getDisplayMedia
        if (err === 'tabCapture_unavailable') {
          try {
            const url = chrome.runtime.getURL(`capture.html?tabId=${encodeURIComponent(tabId)}`);
            await chrome.windows.create({ url, type: 'popup', height: 420, width: 660 });
            return;
          } catch (openErr) {
            console.warn('Could not open capture page for fallback:', openErr);
          }
        }
        alert('Failed to capture audio: ' + err);
      }
    } catch (error) {
      console.error('Error capturing tab:', error);
      alert('Error capturing tab audio');
    }
  }
  
  async selectOutput(deviceId) {
    try {
      await chrome.storage.local.set({ selectedOutput: deviceId });
      alert('Output device selected: ' + deviceId);
    } catch (error) {
      console.error('Error selecting output:', error);
      alert('Error selecting output device');
    }
  }
  
  async refresh() {
    await this.loadTabs();
    await this.loadOutputs();
  }
  
  openOptions() {
    chrome.runtime.openOptionsPage();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AudioSplitterPopup();
});
