// Options page controller
class OptionsManager {
  constructor() {
    this.defaultSettings = {
      autoCapture: false,
      showNotifications: true,
      sampleRate: 48000,
      bufferSize: 1024,
      enableLogging: false
    };
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    document.getElementById('save-btn').addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-btn').addEventListener('click', () => this.resetSettings());
  }
  
  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get(this.defaultSettings);
      
      document.getElementById('auto-capture').checked = settings.autoCapture;
      document.getElementById('show-notifications').checked = settings.showNotifications;
      document.getElementById('sample-rate').value = settings.sampleRate;
      document.getElementById('buffer-size').value = settings.bufferSize;
      document.getElementById('enable-logging').checked = settings.enableLogging;
      
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }
  
  async saveSettings() {
    try {
      const settings = {
        autoCapture: document.getElementById('auto-capture').checked,
        showNotifications: document.getElementById('show-notifications').checked,
        sampleRate: parseInt(document.getElementById('sample-rate').value),
        bufferSize: parseInt(document.getElementById('buffer-size').value),
        enableLogging: document.getElementById('enable-logging').checked
      };
      
      await chrome.storage.local.set(settings);
      
      this.showStatus('Settings saved successfully!', 'success');
      
      // Log if logging is enabled
      if (settings.enableLogging) {
        console.log('Settings saved:', settings);
      }
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings', 'error');
    }
  }
  
  async resetSettings() {
    try {
      await chrome.storage.local.set(this.defaultSettings);
      await this.loadSettings();
      this.showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showStatus('Error resetting settings', 'error');
    }
  }
  
  showStatus(message, type) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} show`;
    
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 3000);
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
