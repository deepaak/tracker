# TimeTracker Desktop 📊

A powerful, lightweight desktop time tracking application similar to TimeDoctor, built with Electron and React. Features a beautiful glassmorphism UI, automatic screenshot capture, activity monitoring, and AI-powered search capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Electron](https://img.shields.io/badge/Electron-31.7.5-47848F.svg)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg)

## ✨ Features

### 🎯 Core Functionality
- **Time Tracking**: Start/stop session tracking with precision timing
- **Automatic Screenshots**: Captures application-specific or full-screen screenshots every 30 seconds
- **Activity Monitoring**: Detects user activity and idle time
- **Draggable Widget**: Move the tracker anywhere on your screen
- **Minimized Bar Mode**: Compact horizontal bar for non-intrusive tracking
- **Data Persistence**: All tracking data saved locally

### 🤖 AI Integration
- **Claude 3.5 Sonnet**: Default AI model for enhanced responses
- **Claude 4.0 Support**: Latest model available
- **OpenAI GPT Support**: Alternative AI provider
- **Intelligent Search**: Get answers and insights about your work

### 🎨 User Interface
- **Dark Theme**: Easy on the eyes with glassmorphism effects
- **Frameless Design**: Clean widget appearance without OS window controls
- **Responsive Layout**: Adapts to different screen sizes
- **Always on Top**: Stays visible above other applications
- **Blue Accent Colors**: Modern, professional appearance

### ⚙️ Advanced Features
- **Custom Screenshot Path**: Choose where screenshots are saved
- **Window Detection**: Capture specific application windows (with permissions)
- **Activity Analytics**: Track productivity patterns
- **Settings Management**: Configure API keys and preferences
- **Cross-platform**: macOS, Windows, and Linux support

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/timetracker-desktop.git
   cd timetracker-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the React app**
   ```bash
   npm run build
   ```

4. **Run the application**
   ```bash
   npm run electron
   ```

## 🖥️ macOS Setup & Permissions

### Required Permissions

TimeTracker requires specific macOS permissions to function properly:

#### 1. Screen Recording Permission
```bash
System Settings → Privacy & Security → Screen Recording
```
- Click the **lock** 🔒 and enter your password
- Click **"+"** and add:
  - **Development**: `Electron` or `Terminal`
  - **Production**: `Time Tracker`
- Ensure it's **checked** ✅

#### 2. Accessibility Permission
```bash
System Settings → Privacy & Security → Accessibility
```
- Click the **lock** 🔒 and enter your password
- Click **"+"** and add the same application as above
- Ensure it's **checked** ✅

### Permission Troubleshooting

If you see: `❌ Window detection error: Command failed`

1. **Check which app to add**:
   - **Development mode** (`npm run electron`): Add `Electron`
   - **Production DMG**: Add `Time Tracker`

2. **Find Electron location**:
   ```bash
   # Usually located at:
   /Applications/Electron.app
   # Or in node_modules:
   ./node_modules/electron/dist/Electron.app
   ```

3. **Restart the application** after granting permissions

## 🛠️ Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build React app only
npm run build

# Run Electron app
npm run electron

# Development server only
npm run webpack-dev

# Build production packages
npm run dist-mac    # macOS DMG
npm run dist-win    # Windows installer
npm run dist        # All platforms
```

### Project Structure

```
timetracker-desktop/
├── public/
│   ├── main.js              # Electron main process
│   └── assets/              # Icons and static files
├── src/
│   ├── components/          # React components
│   │   ├── App.js          # Main app component
│   │   ├── TimerWidget.js  # Timer functionality
│   │   ├── AISearch.js     # AI search interface
│   │   ├── Settings.js     # Configuration panel
│   │   └── Stats.js        # Analytics display
│   ├── styles/
│   │   └── global.css      # Application styles
│   └── index.js            # React entry point
├── build/                   # Built React app
├── dist/                   # Production packages
└── node_modules/           # Dependencies
```

## ⚙️ Configuration

### AI Setup

1. **Navigate to Settings** (⚙️ tab)

2. **Add API Keys**:
   - **Anthropic**: Get from [console.anthropic.com](https://console.anthropic.com)
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)

3. **Configure Models**:
   - **Claude 3.5 Sonnet** (Recommended)
   - **Claude 4.0** (Latest)
   - **GPT-4** (Alternative)

### Screenshot Settings

1. **Default Location**: `~/Documents/TimeTracker/Screenshots`

2. **Custom Path**: 
   - Go to Settings → Screenshot Settings
   - Click **"📁 Browse"** to select folder
   - Path is saved automatically

### Window Detection

Enable application-specific screenshots by granting the required permissions mentioned above.

## 📦 Building for Production

### macOS (DMG)
```bash
npm run dist-mac
```
**Output**: `dist/Time Tracker-1.0.0.dmg` (Intel) and `dist/Time Tracker-1.0.0-arm64.dmg` (Apple Silicon)

### Windows (NSIS Installer)
```bash
npm run dist-win
```
**Output**: `dist/Time Tracker Setup 1.0.0.exe`

### Linux (AppImage)
```bash
npm run dist
```
**Output**: `dist/Time Tracker-1.0.0.AppImage`

## 🐛 Troubleshooting

### Common Issues

#### 1. Window Detection Not Working
**Error**: `Window detection permissions not available`

**Solution**:
- Ensure Screen Recording permission is granted
- Restart the application
- Check that the correct app is added to permissions

#### 2. AI Search Failing
**Error**: `Error invoking remote method 'search-ai'`

**Solution**:
- Verify API keys are configured in Settings
- Check internet connection
- Ensure API quotas are not exceeded

#### 3. Screenshots Not Saving
**Solution**:
- Check screenshot path in Settings
- Ensure write permissions for the directory
- Verify disk space availability

#### 4. App Won't Start
**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
npm run electron
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run electron
```

## 🧪 Testing

### Permission Test
Use the built-in **"🔍 Test Permissions"** button in the Timer tab to verify window detection is working.

### Manual Testing
1. Start tracking
2. Switch between applications
3. Check console for window detection logs
4. Verify screenshots are being saved

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add comments for complex functionality
- Test on multiple platforms when possible
- Update README if adding new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron** - Cross-platform desktop framework
- **React** - User interface library
- **get-windows** - Window detection functionality
- **screenshot-desktop** - Screenshot capture
- **Anthropic & OpenAI** - AI integration

## 📞 Support

If you encounter any issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [Issues](https://github.com/yourusername/timetracker-desktop/issues)
3. Create a new issue with:
   - Operating system and version
   - Node.js version (`node --version`)
   - Steps to reproduce
   - Console error messages

## 🗺️ Roadmap

- [ ] Cloud sync capabilities
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile companion app
- [ ] Integration with project management tools
- [ ] Customizable themes
- [ ] Productivity insights and recommendations

---

**Built with ❤️ using Electron and React**

*TimeTracker Desktop - Professional time tracking made simple.*
