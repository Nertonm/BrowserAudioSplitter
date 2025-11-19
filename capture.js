// capture.js - captura tab/getDisplayMedia, faz split dos canais e atribui cada canal a um MediaStreamDestination.
// Também permite selecionar deviceId para cada saída (se suportado).
(async function () {
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const leftSelect = document.getElementById('leftOutput');
  const rightSelect = document.getElementById('rightOutput');
  const leftPreview = document.getElementById('leftPreview');
  const rightPreview = document.getElementById('rightPreview');

  let captureStream = null;
  let audioContext = null;
  let destLeft = null;
  let destRight = null;

  function setStatus(txt) { statusEl.textContent = txt; }

  async function enumerateAudioOutputs() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      [leftSelect, rightSelect].forEach(sel => {
        sel.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'default';
        defaultOpt.textContent = 'Default device';
        sel.appendChild(defaultOpt);
      });
      for (const d of outputs) {
        const optL = document.createElement('option');
        optL.value = d.deviceId;
        optL.textContent = d.label || d.deviceId;
        leftSelect.appendChild(optL);

        const optR = document.createElement('option');
        optR.value = d.deviceId;
        optR.textContent = d.label || d.deviceId;
        rightSelect.appendChild(optR);
      }
    } catch (err) {
      console.warn('enumerateDevices failed', err);
    }
  }

  function supportsSetSinkId(el) {
    return !!(el && typeof el.setSinkId === 'function');
  }

  // split stream into two MediaStreamDestinations (one per channel)
  function splitStereoStreamToDestinations(stream) {
    // create AudioContext
    audioContext = new AudioContext();
    const src = audioContext.createMediaStreamSource(stream);

    // If stream has more than 2 channels, we will only handle first two.
    // Create a channel splitter
    const channelCount = 2;
    const splitter = audioContext.createChannelSplitter(channelCount);

    // Connect source -> splitter
    src.connect(splitter);

    // create two destinations
    destLeft = audioContext.createMediaStreamDestination();
    destRight = audioContext.createMediaStreamDestination();

    // create gain nodes to route channels (allows volume control)
    const gainLeft = audioContext.createGain();
    const gainRight = audioContext.createGain();

    // connect splitter outputs to gains and to destinations
    // channel index 0 -> left
    splitter.connect(gainLeft, 0);
    gainLeft.connect(destLeft);

    // channel index 1 -> right
    splitter.connect(gainRight, 1);
    gainRight.connect(destRight);

    return { leftStream: destLeft.stream, rightStream: destRight.stream };
  }

  async function applySinkIdIfSupported(audioEl, deviceId) {
    if (!audioEl) return;
    if (deviceId === 'default') {
      // do nothing; default device will be used
      return;
    }
    if (supportsSetSinkId(audioEl)) {
      try {
        await audioEl.setSinkId(deviceId);
        console.log('setSinkId OK for', deviceId);
      } catch (err) {
        console.warn('setSinkId failed', err);
      }
    } else {
      console.warn('setSinkId not supported in this browser (audio will play on default device).');
    }
  }

  async function startCapture() {
    setStatus('Starting capture...');
    startBtn.disabled = true;

    try {
      // Prefer extension tabCapture if available (Chrome)
      const captureApi = (typeof browser !== 'undefined' && browser.tabCapture) ? browser.tabCapture : (typeof chrome !== 'undefined' ? chrome.tabCapture : null);
      if (captureApi && typeof captureApi.capture === 'function') {
        try {
          // wrapper for promise/callback styles
          const maybe = captureApi.capture({ audio: true, video: false });
          captureStream = maybe && typeof maybe.then === 'function' ? await maybe : await new Promise((res, rej) => {
            try {
              captureApi.capture({ audio: true, video: false }, (s) => {
                const err = (chrome && chrome.runtime && chrome.runtime.lastError) || null;
                if (err) rej(err); else res(s);
              });
            } catch (e) { rej(e); }
          });
          setStatus('Captured via tabCapture');
        } catch (err) {
          console.warn('tabCapture failed:', err);
          captureStream = null;
        }
      }

      // If no captureStream yet, use getDisplayMedia fallback (Firefox or user denied tabCapture)
      if (!captureStream) {
        try {
          captureStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
          setStatus('Captured via getDisplayMedia (fallback)');
        } catch (err) {
          throw new Error('User denied capture or getDisplayMedia failed: ' + (err && err.message ? err.message : err));
        }
      }

      // split the stream, create destinations
      const { leftStream, rightStream } = splitStereoStreamToDestinations(captureStream);

      // attach streams to previews
      leftPreview.srcObject = leftStream;
      rightPreview.srcObject = rightStream;

      // apply sinkIds selected by user (if supported)
      const leftDevice = leftSelect.value || 'default';
      const rightDevice = rightSelect.value || 'default';
      await applySinkIdIfSupported(leftPreview, leftDevice);
      await applySinkIdIfSupported(rightPreview, rightDevice);

      stopBtn.disabled = false;
      setStatus('Capturing — left/right preview active');
    } catch (err) {
      console.error('Start capture error', err);
      setStatus('Erro ao iniciar captura: ' + (err && err.message ? err.message : err));
      startBtn.disabled = false;
    }
  }

  function stopCapture() {
    setStatus('Stopping capture...');
    stopBtn.disabled = true;
    startBtn.disabled = false;
    try {
      if (captureStream) {
        captureStream.getTracks().forEach(t => t.stop());
        captureStream = null;
      }
      if (leftPreview && leftPreview.srcObject) {
        leftPreview.srcObject.getTracks().forEach(t => t.stop());
        leftPreview.srcObject = null;
      }
      if (rightPreview && rightPreview.srcObject) {
        rightPreview.srcObject.getTracks().forEach(t => t.stop());
        rightPreview.srcObject = null;
      }
      if (audioContext) {
        try { audioContext.close(); } catch(e) {}
        audioContext = null;
      }
      setStatus('Stopped');
    } catch (err) {
      console.warn('stopCapture error', err);
      setStatus('Erro ao parar captura');
    }
  }

  // wire UI
  startBtn.addEventListener('click', startCapture);
  stopBtn.addEventListener('click', stopCapture);

  // enumerate devices on load (labels may be empty until user grants media permissions)
  await enumerateAudioOutputs();

  // Re-enumerate when devices change
  navigator.mediaDevices && navigator.mediaDevices.addEventListener && navigator.mediaDevices.addEventListener('devicechange', enumerateAudioOutputs);
})();