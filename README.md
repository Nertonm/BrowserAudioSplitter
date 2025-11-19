# 🔊 Browser Audio Splitter

A powerful browser extension that allows you to capture and route audio from different browser tabs to separate audio outputs. Perfect for streamers, content creators, and power users who need advanced audio control.

## ✨ Features

- **Tab Audio Capture**: Capture audio from individual browser tabs
- **Multi-Tab Support**: Monitor and control audio from multiple tabs simultaneously
- **Real-Time Monitoring**: See which tabs are currently playing audio
- **Customizable Settings**: Configure sample rates, buffer sizes, and more
- **User-Friendly Interface**: Clean, modern UI with easy-to-use controls
- **Audio Quality Control**: Choose between different sample rates (44.1 kHz, 48 kHz, 96 kHz)
- **Notifications**: Optional notifications when audio capture starts or stops

## 📦 Installation

### From Source

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" using the toggle in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Browser Audio Splitter extension should now appear in your extensions list

### From Chrome Web Store

*(Coming soon)*

## 🚀 Usage

### Basic Usage

1. Click the Browser Audio Splitter icon in your browser toolbar
2. The popup will show all tabs with audio capability
3. Click "Capture" on any tab to start capturing its audio
4. Audio will be routed through the extension's audio processing

### Managing Settings

1. Click the "⚙️ Options" button in the popup
2. Configure your preferences:
   - **Auto-capture**: Automatically capture audio from new tabs
   - **Notifications**: Enable/disable notification alerts
   - **Sample Rate**: Choose audio quality (higher = better quality)
   - **Buffer Size**: Adjust for latency vs. stability balance
   - **Debug Logging**: Enable for troubleshooting

### Tips

- **For Streaming**: Use this extension to capture game audio separately from voice chat
- **For Recording**: Isolate specific tab audio for cleaner recordings
- **For Testing**: Monitor audio output from different sources simultaneously

## 🔧 Technical Details

### Permissions

The extension requires the following permissions:

- **tabCapture**: To capture audio from browser tabs
- **storage**: To save user preferences and settings
- **tabs**: To monitor and access tab information

### Browser Compatibility

- ✅ Google Chrome (v88+)
- ✅ Microsoft Edge (v88+)
- ✅ Other Chromium-based browsers
- ❌ Firefox (uses different extension API - not compatible)
- ❌ Safari (uses different extension API - not compatible)

### Audio Processing

The extension uses the Web Audio API for audio processing:

- **AudioContext**: Creates audio processing graphs
- **MediaStreamSource**: Captures audio from tab streams
- **Audio Routing**: Routes audio through processing nodes

### Limitations

Due to browser security restrictions:

1. **Output Device Selection**: Direct selection of audio output devices is limited by browser APIs. For advanced routing, consider using system audio tools (e.g., VB-Audio VoiceMeeter, Virtual Audio Cable)
2. **Tab Permissions**: Some tabs (like chrome:// pages) cannot have their audio captured
3. **DRM Content**: Protected content may not be capturable due to DRM restrictions

## 🛠️ Development

### Project Structure

```
BrowserAudioSplitter/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for audio processing
├── popup.html            # Popup UI structure
├── popup.css             # Popup styling
├── popup.js              # Popup logic and controls
├── options.html          # Options page structure
├── options.css           # Options page styling
├── options.js            # Options page logic
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Building

No build process required - this is a pure JavaScript extension.

### Testing

1. Load the extension in developer mode
2. Open tabs with audio (YouTube, Spotify, etc.)
3. Test capturing audio from different tabs
4. Verify settings persist across browser sessions

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Test thoroughly before submitting
- Update documentation as needed
- Keep commits focused and descriptive

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Known Issues

- Output device selection is limited by browser API constraints
- Some DRM-protected content cannot be captured
- Chrome system pages (chrome://) cannot be captured

## 💡 Future Enhancements

- [ ] Audio filters and effects
- [ ] Volume control per tab
- [ ] Audio visualization
- [ ] Recording functionality
- [ ] Preset management for common scenarios
- [ ] Native messaging host for advanced audio routing

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include browser version and console logs if applicable

## 🙏 Acknowledgments

- Icons designed with love for the audio community
- Built with modern web technologies
- Inspired by the need for better audio control in browsers

---

**Note**: This extension is designed to work within browser security constraints. For professional audio routing needs, consider using dedicated system-level audio tools in conjunction with this extension.