const { app, BrowserWindow, ipcMain, screen, dialog, Menu, Tray } = require('electron');
const path = require('path');
// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true';
const Store = require('electron-store');
const screenshot = require('screenshot-desktop');
const fs = require('fs');

// Native modules for window detection and automation
let getActiveWindow;
let getOpenWindows;
let windowDetectionReady = false;
let permissionErrorShown = false;

async function loadWindowDetection() {
  try {
    console.log('Loading get-windows module...');
    const getWindowsModule = await import('get-windows');
    console.log('Module loaded, available functions:', Object.keys(getWindowsModule));
    
    getActiveWindow = getWindowsModule.activeWindow;
    getOpenWindows = getWindowsModule.openWindows;
    windowDetectionReady = true;
    
    console.log('Window detection module loaded successfully');
    console.log('getActiveWindow function:', typeof getActiveWindow);
    console.log('getOpenWindows function:', typeof getOpenWindows);
  } catch (error) {
    console.warn('Window detection module not available:', error.message);
    getActiveWindow = null;
    getOpenWindows = null;
    windowDetectionReady = false;
  }
}

async function checkWindowDetectionPermissions() {
  if (!windowDetectionReady || !getActiveWindow) {
    console.log('Window detection not ready or getActiveWindow not available');
    return false;
  }
  
  try {
    // Test with a simple call to see if we can get window information
    const activeWindow = await getActiveWindow();
    console.log('✅ Window detection permissions working! Current window:', activeWindow?.title || 'Unknown');
    return true;
  } catch (error) {
    console.error('❌ Window detection error:', error.message);
    
    if (error.message.includes('accessibility permission') || 
        error.message.includes('Command failed') ||
        error.message.includes('permission denied') ||
        error.message.includes('not authorized')) {
      
      if (!permissionErrorShown) {
        console.warn('🔒 ACCESSIBILITY PERMISSION REQUIRED');
        console.warn('════════════════════════════════════════════════════════');
        console.warn('Current app path:', process.execPath);
        console.warn('');
        console.warn('IMPORTANT: Add the correct app to Privacy & Security:');
        if (process.env.NODE_ENV === 'development' || process.execPath.includes('node_modules')) {
          console.warn('🔧 DEVELOPMENT MODE: Add "Electron" to accessibility permissions');
          console.warn('   - Look for "Electron" in the Accessibility list');
          console.warn('   - Or add the Electron app from: /Applications/Electron.app');
        } else {
          console.warn('📦 PRODUCTION MODE: Add "Time Tracker" to accessibility permissions');
          console.warn('   - Look for "Time Tracker" in the Accessibility list');
        }
        console.warn('');
        console.warn('Steps:');
        console.warn('1. Open System Settings (or System Preferences)');
        console.warn('2. Go to Privacy & Security › Accessibility');
        console.warn('3. Click the lock and enter your password');
        console.warn('4. Click + and add the app mentioned above');
        console.warn('5. Make sure it\'s checked ✅');
        console.warn('6. Restart this application');
        console.warn('════════════════════════════════════════════════════════');
        permissionErrorShown = true;
      }
      return false;
    }
    
    // Re-throw unexpected errors
    console.error('Unexpected window detection error:', error);
    return false;
  }
}

// Load the module asynchronously
loadWindowDetection();

// Note: robotjs has compilation issues with Electron 37+, using alternatives

// Initialize electron store for persistent data
let store;
try {
  const Store = require('electron-store');
  store = new Store();
  console.log('Electron store initialized successfully');
} catch (error) {
  console.error('Error initializing store:', error);
  // Fallback to a simple object
  store = {
    get: (key, defaultValue) => defaultValue,
    set: (key, value) => {},
    has: (key) => false
  };
}

let mainWindow;
let tray;
let isTracking = false;
let trackingInterval;
let screenshotInterval;
let idleCheckInterval;
let startTime;
let totalTime = 0;
let lastActivity = Date.now();

// Configuration
const SCREENSHOT_INTERVAL = 30 * 1000; // 30 seconds (for testing)
const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    x: width - 370,
    y: 20,
    frame: true, // Enable frame for debugging
    transparent: false, // Disable transparency for debugging
    alwaysOnTop: false, // Changed to false for better compatibility
    resizable: true,
    minimizable: true,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
    // Removed icon path that doesn't exist
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Load the React app
  const startUrl = isDev 
    ? 'http://localhost:3002' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  console.log('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl);

  // Handle load events
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window minimize
  mainWindow.on('minimize', () => {
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Make window draggable
  mainWindow.setMovable(true);
}

function createTray() {
  // Temporarily disabled tray functionality
  console.log('Tray functionality temporarily disabled');
}

// Screenshot functionality - Enhanced for active window capture
async function takeScreenshot() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(__dirname, '../screenshots', filename);
    
    let activeWindow = null;
    let imgData = null;
    let captureType = 'fullscreen';
    
    // Get active window information first
    let hasPermissions = false;
    if (windowDetectionReady && getActiveWindow) {
      hasPermissions = await checkWindowDetectionPermissions();
      
      if (hasPermissions) {
        try {
          console.log('Getting active window...');
          const currentActiveWindow = await getActiveWindow();
          
          if (currentActiveWindow) {
            console.log('✅ Active window found:', currentActiveWindow.title);
            console.log('Window app:', currentActiveWindow.owner?.name || 'Unknown');
            console.log('Window bounds available:', !!currentActiveWindow.bounds);
            
            if (currentActiveWindow.bounds) {
              console.log('Window bounds:', JSON.stringify(currentActiveWindow.bounds, null, 2));
            }
            
            activeWindow = currentActiveWindow; // Store for screenshot
          } else {
            console.log('No active window detected');
          }
        } catch (error) {
          console.warn('Unexpected error getting active window:', error.message);
        }
      }
    }
    
    if (!hasPermissions) {
      console.log('📸 Using full-screen capture mode (no window permissions)');
    }
    
    // Enhanced window-specific screenshot capture
    try {
      if (activeWindow && activeWindow.bounds) {
        // Capture specific window area
        const bounds = activeWindow.bounds;
        console.log('Capturing window-specific screenshot with bounds:', bounds);
        
        imgData = await screenshot({ 
          format: 'png',
          screen: bounds.x !== undefined ? {
            x: Math.max(0, bounds.x),
            y: Math.max(0, bounds.y), 
            width: bounds.width,
            height: bounds.height
          } : undefined
        });
        captureType = 'active_window';
        console.log(`Captured active window screenshot: ${activeWindow.title}`);
      } else {
        // Fallback to full screen if no window bounds available
        imgData = await screenshot({ format: 'png' });
        captureType = 'fullscreen_fallback';
        console.log('Captured full screen screenshot (no active window bounds available)');
      }
    } catch (screenshotError) {
      console.error('Failed to capture screenshot:', screenshotError);
      // Try full screen as backup
      try {
        imgData = await screenshot({ format: 'png' });
        captureType = 'fullscreen_backup';
        console.log('Captured full screen screenshot as backup');
      } catch (backupError) {
        console.error('Failed to capture backup screenshot:', backupError);
        return null;
      }
    }
    
    // Ensure screenshots directory exists
    const screenshotsDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    // Save screenshot
    fs.writeFileSync(filepath, imgData);
    console.log('Screenshot saved:', filename);
    
    const screenshotData = {
      filename,
      filepath,
      timestamp: new Date().toISOString(),
      activeWindow: activeWindow ? {
        title: activeWindow.title || 'Unknown',
        owner: activeWindow.owner || { name: 'Unknown' },
        bounds: activeWindow.bounds || null,
        pid: activeWindow.pid || null,
        platform: process.platform,
        url: activeWindow.url || null // For browsers
      } : null,
      captureType,
      fileSize: imgData ? imgData.length : 0,
      // Additional context
      context: {
        userAgent: process.platform,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      }
    };
    
    // Store screenshot info
    const screenshots = store.get('screenshots', []);
    screenshots.push(screenshotData);
    store.set('screenshots', screenshots);
    
    // Send to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('screenshot-taken', screenshotData);
    }
    
    return screenshotData;
  } catch (error) {
    console.error('Error taking screenshot:', error);
    return null;
  }
}

// Manual screenshot trigger for testing
ipcMain.handle('take-manual-screenshot', async () => {
  console.log('Manual screenshot requested');
  return await takeScreenshot();
});

// Manual permission test for debugging
ipcMain.handle('test-permissions', async () => {
  console.log('Testing window detection permissions...');
  const hasPermissions = await checkWindowDetectionPermissions();
  console.log('Permission test result:', hasPermissions);
  return hasPermissions;
});

// Activity monitoring with enhanced detection
async function checkActivity() {
  const currentTime = Date.now();
  let hasActivity = false;
  
  // Method 1: Check if active window changed
  if (windowDetectionReady && getActiveWindow) {
    try {
      const hasPermissions = await checkWindowDetectionPermissions();
      if (hasPermissions) {
        const currentActiveWindow = await getActiveWindow();
        const currentTitle = currentActiveWindow ? currentActiveWindow.title : '';
        const currentPid = currentActiveWindow ? currentActiveWindow.pid : 0;
      
        // Store previous window info for comparison
        if (!checkActivity.previousWindow) {
          checkActivity.previousWindow = { title: '', pid: 0 };
        }
        
        // Detect window change as activity
        if (currentTitle !== checkActivity.previousWindow.title || 
            currentPid !== checkActivity.previousWindow.pid) {
          hasActivity = true;
          console.log('Activity detected: Window changed to', currentTitle);
        }
        
        checkActivity.previousWindow = { title: currentTitle, pid: currentPid };
      } else {
        console.warn('Window detection permissions not available - using fallback activity detection');
      }
    } catch (error) {
      console.warn('Error checking active window for activity:', error);
    }
  }
  
  // Method 2: Use Electron's built-in system idle detection
  try {
    const idleTime = require('electron').powerMonitor.getSystemIdleTime();
    // If idle time is very low (< 5 seconds), consider it as recent activity
    if (idleTime < 5) {
      hasActivity = true;
      console.log('Activity detected: System idle time is low:', idleTime, 'seconds');
    }
  } catch (error) {
    console.warn('System idle detection not available:', error);
  }
  
  // Update last activity time if activity detected
  if (hasActivity || isTracking) {
    lastActivity = currentTime;
  }
  
  // Check for idle time
  const idleTime = currentTime - lastActivity;
  const isIdle = idleTime > IDLE_THRESHOLD;
  
  if (mainWindow) {
    mainWindow.webContents.send('activity-update', {
      isIdle,
      idleTime,
      lastActivity: new Date(lastActivity).toISOString(),
      hasRecentActivity: hasActivity
    });
  }
  
  // Auto-pause tracking if idle for too long (optional)
  if (isIdle && isTracking) {
    console.log('User appears to be idle for', Math.round(idleTime / 1000), 'seconds');
  }
}

// IPC handlers
ipcMain.handle('start-tracking', async () => {
  if (isTracking) return false;
  
  isTracking = true;
  startTime = Date.now();
  lastActivity = Date.now();
  
  // Start intervals
  trackingInterval = setInterval(() => {
    if (mainWindow) {
      const currentTime = Date.now();
      const sessionTime = currentTime - startTime;
      mainWindow.webContents.send('time-update', {
        sessionTime,
        totalTime: totalTime + sessionTime,
        isTracking
      });
    }
  }, 1000);
  
  screenshotInterval = setInterval(takeScreenshot, SCREENSHOT_INTERVAL);
  idleCheckInterval = setInterval(checkActivity, ACTIVITY_CHECK_INTERVAL);
  
  // Take initial screenshot
  await takeScreenshot();
  
  store.set('isTracking', true);
  store.set('startTime', startTime);
  
  return true;
});

ipcMain.handle('stop-tracking', async () => {
  if (!isTracking) return false;
  
  isTracking = false;
  
  // Calculate session time
  const sessionTime = Date.now() - startTime;
  totalTime += sessionTime;
  
  // Clear intervals
  if (trackingInterval) clearInterval(trackingInterval);
  if (screenshotInterval) clearInterval(screenshotInterval);
  if (idleCheckInterval) clearInterval(idleCheckInterval);
  
  // Save data
  const session = {
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration: sessionTime,
    screenshots: store.get('screenshots', []).filter(s => 
      new Date(s.timestamp) >= new Date(startTime)
    )
  };
  
  const sessions = store.get('sessions', []);
  sessions.push(session);
  store.set('sessions', sessions);
  store.set('totalTime', totalTime);
  store.set('isTracking', false);
  
  return { sessionTime, totalTime };
});

ipcMain.handle('get-settings', () => {
  return store.get('settings', {
    openAIKey: '',
    anthropicKey: '',
    firstName: '',
    lastName: '',
    email: '',
    serverUrl: 'https://api.example.com'
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('get-stats', () => {
  const sessions = store.get('sessions', []);
  const screenshots = store.get('screenshots', []);
  
  return {
    totalTime: store.get('totalTime', 0),
    sessionsCount: sessions.length,
    screenshotsCount: screenshots.length,
    isTracking: store.get('isTracking', false),
    lastSession: sessions[sessions.length - 1] || null
  };
});

ipcMain.handle('search-ai', async (event, { query, provider }) => {
  const settings = store.get('settings', {});
  
  try {
    let response;
    
    if (provider === 'openai') {
      const apiKey = settings.openAIKey;
      if (!apiKey) throw new Error('OpenAI API key not configured');
      
      // Make API call to OpenAI
      const axios = require('axios');
      response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: query }],
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.choices[0].message.content;
      
    } else if (provider === 'anthropic') {
      const apiKey = settings.anthropicKey;
      if (!apiKey) throw new Error('Anthropic API key not configured');
      
      // Make API call to Anthropic
      const axios = require('axios');
      response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 150,
        messages: [{ role: 'user', content: query }]
      }, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });
      
      return response.data.content[0].text;
    }
    
  } catch (error) {
    console.error('AI Search Error:', error);
    throw new Error(`AI Search failed: ${error.message}`);
  }
});

ipcMain.handle('upload-data', async () => {
  const settings = store.get('settings', {});
  const sessions = store.get('sessions', []);
  const screenshots = store.get('screenshots', []);
  
  try {
    const axios = require('axios');
    
    const uploadData = {
      user: {
        firstName: settings.firstName,
        lastName: settings.lastName,
        email: settings.email
      },
      sessions,
      screenshots: screenshots.map(s => ({
        ...s,
        filepath: undefined // Don't send local file paths
      })),
      timestamp: new Date().toISOString()
    };
    
    await axios.post(`${settings.serverUrl}/upload`, uploadData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Upload Error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Restore previous state
  const wasTracking = store.get('isTracking', false);
  const storedStartTime = store.get('startTime');
  totalTime = store.get('totalTime', 0);
  
  if (wasTracking && storedStartTime) {
    // Resume tracking if app was closed while tracking
    isTracking = true;
    startTime = storedStartTime;
    lastActivity = Date.now();
    
    trackingInterval = setInterval(() => {
      if (mainWindow) {
        const currentTime = Date.now();
        const sessionTime = currentTime - startTime;
        mainWindow.webContents.send('time-update', {
          sessionTime,
          totalTime: totalTime + sessionTime,
          isTracking
        });
      }
    }, 1000);
    
    screenshotInterval = setInterval(takeScreenshot, SCREENSHOT_INTERVAL);
    idleCheckInterval = setInterval(checkActivity, ACTIVITY_CHECK_INTERVAL);
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Save current state
  if (isTracking) {
    const sessionTime = Date.now() - startTime;
    totalTime += sessionTime;
    store.set('totalTime', totalTime);
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
