// capture.js
// Handles audio capture in a DOM context (avoids service worker limitations)
(function () {
  const statusEl = document.getElementById('status');
  const previewEl = document.getElementById('preview');
  const stopBtn = document.getElementById('stopBtn');

  let captureStream = null;
  let audioContext = null;

  async function startCapture() {
    try {
      statusEl.textContent = 'Requesting audio capture...';

      // Try tabCapture first (Chrome-specific)
      if (typeof chrome !== 'undefined' && chrome.tabCapture && chrome.tabCapture.capture) {
        try {
          captureStream = await new Promise((resolve, reject) => {
            chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
              const err = chrome.runtime && chrome.runtime.lastError;
              if (err) reject(err);
              else resolve(stream);
            });
          });

          if (captureStream) {
            statusEl.textContent = 'Successfully captured tab audio via tabCapture';
            setupAudioPreview();
            return;
          }
        } catch (e) {
          console.warn('tabCapture failed, trying fallback:', e);
        }
      }

      // Fallback to getDisplayMedia (works in Firefox and Chrome)
      statusEl.textContent = 'Using getDisplayMedia fallback...';
      captureStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false
      });

      if (captureStream) {
        statusEl.textContent = 'Successfully captured audio via getDisplayMedia';
        setupAudioPreview();
      } else {
        throw new Error('No capture stream available');
      }
    } catch (error) {
      console.error('Capture error:', error);
      statusEl.textContent = 'Failed to capture audio: ' + error.message;
      statusEl.style.borderLeftColor = '#f44336';
    }
  }

  function setupAudioPreview() {
    try {
      // Connect stream to audio element for preview
      if (previewEl && captureStream) {
        previewEl.srcObject = captureStream;
      }

      // Create AudioContext for processing (only in DOM context, not service worker)
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(captureStream);

      // Connect to destination for playback
      source.connect(audioContext.destination);

      // Monitor stream end
      const tracks = captureStream.getAudioTracks();
      if (tracks && tracks[0]) {
        tracks[0].onended = () => {
          statusEl.textContent = 'Capture ended';
          stopCapture();
        };
      }
    } catch (error) {
      console.error('Error setting up preview:', error);
      statusEl.textContent = 'Audio captured but preview failed: ' + error.message;
    }
  }

  function stopCapture() {
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      captureStream = null;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    if (previewEl) {
      previewEl.srcObject = null;
    }

    statusEl.textContent = 'Capture stopped';
    statusEl.style.borderLeftColor = '#999';
  }

  // Event listeners
  stopBtn.addEventListener('click', () => {
    stopCapture();
  });

  // Start capture when page loads
  window.addEventListener('load', () => {
    startCapture();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopCapture();
  });
})();
