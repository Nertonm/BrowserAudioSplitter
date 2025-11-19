// capture.js - capture via tabCapture (Chrome) and split stereo into two outputs.
// NOTE: doesn't call getDisplayMedia automatically to avoid requiring a user gesture here.
(async function () {
	const statusEl = document.getElementById('status');
	const startBtn = document.getElementById('startBtn');
	const fallbackBtn = document.getElementById('fallbackBtn');
	const stopBtn = document.getElementById('stopBtn');
	const leftSelect = document.getElementById('leftOutput');
	const rightSelect = document.getElementById('rightOutput');
	const leftPreview = document.getElementById('leftPreview');
	const rightPreview = document.getElementById('rightPreview');

	let captureStream = null;
	let audioContext = null;
	let destLeft = null;
	let destRight = null;

	function setStatus(txt) { if (statusEl) statusEl.textContent = txt; }

	async function enumerateAudioOutputs() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const outputs = devices.filter(d => d.kind === 'audiooutput');
			[leftSelect, rightSelect].forEach(sel => {
				if (!sel) return;
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
				leftSelect && leftSelect.appendChild(optL);

				const optR = document.createElement('option');
				optR.value = d.deviceId;
				optR.textContent = d.label || d.deviceId;
				rightSelect && rightSelect.appendChild(optR);
			}
		} catch (err) {
			console.warn('enumerateDevices failed', err);
		}
	}

	function supportsSetSinkId(el) {
		return !!(el && typeof el.setSinkId === 'function');
	}

	function splitStereoStreamToDestinations(stream) {
		audioContext = new AudioContext();
		const src = audioContext.createMediaStreamSource(stream);

		// Detect channel count if available; fallback to 2
		let channelCount = 2;
		try {
			const track = stream.getAudioTracks()[0];
			if (track && typeof track.getSettings === 'function') {
				const settings = track.getSettings();
				if (settings && settings.channelCount) channelCount = settings.channelCount;
			}
		} catch (e) {
			// ignore
		}

		destLeft = audioContext.createMediaStreamDestination();
		destRight = audioContext.createMediaStreamDestination();
		const gainLeft = audioContext.createGain();
		const gainRight = audioContext.createGain();

		if (channelCount >= 2) {
			const splitter = audioContext.createChannelSplitter(2);
			src.connect(splitter);
			splitter.connect(gainLeft, 0);
			splitter.connect(gainRight, 1);
		} else {
			// Mono source: deliver same mono signal to both outputs
			src.connect(gainLeft);
			src.connect(gainRight);
		}

		gainLeft.connect(destLeft);
		gainRight.connect(destRight);

		// Ensure AudioContext resumed (autoplay policies)
		if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
			audioContext.resume().catch(() => {});
		}

		return { leftStream: destLeft.stream, rightStream: destRight.stream };
	}

	async function applySinkIdIfSupported(audioEl, deviceId) {
		if (!audioEl) return;
		if (deviceId === 'default') return;
		if (supportsSetSinkId(audioEl)) {
			try {
				await audioEl.setSinkId(deviceId);
				console.log('setSinkId OK for', deviceId);
			} catch (err) {
				console.warn('setSinkId failed', err);
			}
		} else {
			console.warn('setSinkId not supported (audio will play on default device).');
		}
	}

	async function startTabCapture() {
		setStatus('Trying tabCapture...');
		startBtn.disabled = true;
		try {
			const captureApi = (typeof browser !== 'undefined' && browser.tabCapture) ? browser.tabCapture : (typeof chrome !== 'undefined' ? chrome.tabCapture : null);
			if (!captureApi || typeof captureApi.capture !== 'function') {
				setStatus('tabCapture not available here');
				startBtn.disabled = false;
				return;
			}
			let stream;
			try {
				// Try to capture the tab specified by ?tabId in the URL (background opens this page with that param)
				const qs = new URLSearchParams(location.search);
				const requestedTabId = qs.get('tabId');
				const tryOptions = [{ audio: true, video: false }];
				if (requestedTabId) {
					const tid = parseInt(requestedTabId, 10);
					if (!Number.isNaN(tid)) {
						// try common option names used by implementations
						tryOptions.unshift({ audio: true, video: false, targetTabId: tid });
						tryOptions.unshift({ audio: true, video: false, tabId: tid });
					}
				}

				let lastErr = null;
				for (const opts of tryOptions) {
					try {
						const maybe = captureApi.capture(opts);
						stream = maybe && typeof maybe.then === 'function' ? await maybe : await new Promise((res, rej) => {
							try {
								captureApi.capture(opts, (s) => {
									const err = (chrome && chrome.runtime && chrome.runtime.lastError) || null;
									if (err) rej(err); else res(s);
								});
							} catch (e) { rej(e); }
						});
						if (stream) break;
					} catch (e) {
						lastErr = e;
						console.warn('tabCapture attempt failed for options', opts, e);
					}
				}
				if (!stream && lastErr) throw lastErr;
			} catch (err) {
				console.warn('tabCapture failed:', err);
				setStatus('tabCapture failed: ' + (err && err.message ? err.message : err));
				startBtn.disabled = false;
				return;
			}
			if (!stream) throw new Error('No stream from tabCapture');
			captureStream = stream;
			// notify background that capture started (best-effort)
			try { browser && browser.runtime && browser.runtime.sendMessage && browser.runtime.sendMessage({ action: 'captureStarted', tabId: requestedTabId || null }); } catch(e) { try { chrome && chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.sendMessage({ action: 'captureStarted', tabId: requestedTabId || null }); } catch(_) {} }
			setStatus('Captured via tabCapture');
			const { leftStream, rightStream } = splitStereoStreamToDestinations(stream);
			leftPreview.srcObject = leftStream;
			rightPreview.srcObject = rightStream;
			await enumerateAudioOutputs();
			const leftDevice = leftSelect && leftSelect.value || 'default';
			const rightDevice = rightSelect && rightSelect.value || 'default';
			await applySinkIdIfSupported(leftPreview, leftDevice);
			await applySinkIdIfSupported(rightPreview, rightDevice);
			stopBtn.disabled = false;
			setStatus('Capturing (tabCapture) — left/right preview active');
		} catch (err) {
			console.error('startTabCapture error', err);
			setStatus('Erro ao iniciar tabCapture: ' + (err && err.message ? err.message : err));
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

	async function startFallbackCapture() {
		// user gesture required — uses getDisplayMedia so user can pick the tab/window
		try {
			setStatus('Starting fallback capture (user selection)...');
			const stream = await navigator.mediaDevices.getDisplayMedia({ video: false, audio: true });
			if (!stream) throw new Error('No stream returned from getDisplayMedia');
			// notify background that fallback capture started
			try { browser && browser.runtime && browser.runtime.sendMessage && browser.runtime.sendMessage({ action: 'fallbackCaptureStarted' }); } catch(e) { try { chrome && chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.sendMessage({ action: 'fallbackCaptureStarted' }); } catch(_) {} }
			// reuse split logic
			const { leftStream, rightStream } = splitStereoStreamToDestinations(stream);
			leftPreview.srcObject = leftStream;
			rightPreview.srcObject = rightStream;
			await enumerateAudioOutputs();
			stopBtn.disabled = false;
			setStatus('Capturing (fallback getDisplayMedia) — left/right preview active');
		} catch (err) {
			console.error('Fallback capture failed', err);
			setStatus('Fallback capture failed: ' + (err && err.message ? err.message : err));
		}
	}

	startBtn.addEventListener('click', startTabCapture);
	fallbackBtn && fallbackBtn.addEventListener('click', startFallbackCapture);
	stopBtn.addEventListener('click', stopCapture);

	await enumerateAudioOutputs();
})();

