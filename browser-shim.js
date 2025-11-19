// browser-shim.js
// Lightweight shim: exposes `browser` where only `chrome` exists
// and converts callback-style APIs to Promise-style where possible.
// For production use consider the official webextension-polyfill.
(function () {
	if (typeof browser !== 'undefined') return;
	if (typeof chrome === 'undefined') { window.browser = {}; return; }

	const wrap = (obj) => {
		const out = {};
		for (const key in obj) {
			try {
				const val = obj[key];
				if (typeof val === 'function') {
					out[key] = (...args) => {
						const last = args[args.length - 1];
						const calledWithCallback = typeof last === 'function';
						if (calledWithCallback) return val.apply(obj, args);
						return new Promise((resolve, reject) => {
							try {
								val.apply(obj, [
									...args,
									(result) => {
										const err = chrome.runtime && chrome.runtime.lastError;
										if (err) reject(err);
										else resolve(result);
									}
								]);
							} catch (e) { reject(e); }
						});
					};
				} else if (typeof val === 'object' && val !== null) {
					out[key] = wrap(val);
				} else {
					out[key] = val;
				}
			} catch (e) {
				/* ignore inaccessible properties */
			}
		}
		return out;
	};

	try { window.browser = wrap(chrome); } catch (e) { window.browser = chrome; }
})();