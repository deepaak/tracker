const { app, BrowserWindow, ipcMain, screen, dialog, Menu, Tray } = require('electron');
const path = require('path');
const os = require('os');
// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true';
const Store = require('electron-store');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const sharp = require('sharp');

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
          console.warn('📦 PRODUCTION MODE: Add "Modinsight Glass" to accessibility permissions');
          console.warn('   - Look for "Modinsight Glass" in the Accessibility list');
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
    frame: false, // Remove window frame to hide minimize/close buttons
    transparent: true, // Enable transparency for glassmorphism
    alwaysOnTop: true, // Keep on top for time tracking
    resizable: false, // Make non-resizable for clean look
    minimizable: false, // Remove minimize option
    show: false, // Don't show until ready
    movable: true, // Allow dragging
    icon: path.join(__dirname, 'assets', 'icon.png'), // Custom app icon - using icon.png for better compatibility
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
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
    const settings = store.get('settings', {});
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    
    // Use custom screenshot path if set, otherwise use default
    let screenshotsDir;
    if (settings.screenshotPath && fs.existsSync(settings.screenshotPath)) {
      screenshotsDir = settings.screenshotPath;
    } else {
      // Default path: Documents/ModinsightGlass/Screenshots
      screenshotsDir = path.join(os.homedir(), 'Documents', 'ModinsightGlass', 'Screenshots');
    }
    
    const filepath = path.join(screenshotsDir, filename);
    
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
    serverUrl: 'https://api.example.com',
    screenshotPath: '',
    enableScreenshotAnalysis: true
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

// Screenshot path selector
ipcMain.handle('select-screenshot-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Screenshot Save Location'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  
  return null;
});

ipcMain.handle('get-stats', () => {
  const sessions = store.get('sessions', []);
  const screenshots = store.get('screenshots', []);
  
  console.log('DEBUG: Stats requested');
  console.log('DEBUG: Screenshots count:', screenshots.length);
  console.log('DEBUG: Recent screenshots:', screenshots.slice(-3).map(s => s.filepath || s.path));
  
  return {
    totalTime: store.get('totalTime', 0),
    sessionsCount: sessions.length,
    screenshotsCount: screenshots.length,
    totalScreenshots: screenshots.length, // Add this for the test script
    isTracking: store.get('isTracking', false),
    lastSession: sessions[sessions.length - 1] || null
  };
});

ipcMain.handle('search-ai', async (event, { query, provider, model }) => {
  const settings = store.get('settings', {});
  
  try {
    console.log('AI Search started with query:', query);
    console.log('Provider:', provider, 'Model:', model);
    
    // Take a fresh screenshot for current context before analysis
    console.log('Taking fresh screenshot for AI analysis...');
    const freshScreenshot = await takeScreenshot();
    
    let response;
    
    // Check if screenshot analysis is enabled and get recent screenshots
    const enableScreenshotAnalysis = settings.enableScreenshotAnalysis !== false; // Default to true
    console.log('Screenshot analysis enabled:', enableScreenshotAnalysis);
    
    let recentScreenshots = [];
    if (enableScreenshotAnalysis) {
      // Get the fresh screenshot and combine with recent ones
      recentScreenshots = await getLastScreenshots(1);
      
      // If we successfully took a fresh screenshot, prioritize it
      if (freshScreenshot && freshScreenshot.filepath && fs.existsSync(freshScreenshot.filepath)) {
        // Remove the fresh screenshot from recent list if it's there and add it at the beginning
        recentScreenshots = recentScreenshots.filter(s => s.filepath !== freshScreenshot.filepath);
        recentScreenshots.unshift(freshScreenshot);
      }
    }
    
    console.log('Screenshots for analysis:', recentScreenshots.length);
    
    if (provider === 'openai') {
      const apiKey = settings.openAIKey;
      if (!apiKey) throw new Error('OpenAI API key not configured');
      
      if (recentScreenshots.length > 0) {
        // Use vision analysis with screenshots
        response = await analyzeScreenshotsWithOpenAI(query, recentScreenshots, apiKey);
      } else {
        // Fallback to text-only analysis
        const axios = require('axios');
        const textResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: query }],
          max_tokens: 1000
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        response = textResponse.data.choices[0].message.content;
      }
      
      return response;
      
    } else if (provider === 'anthropic') {
      const apiKey = settings.anthropicKey;
      if (!apiKey) throw new Error('Anthropic API key not configured');
      
      // Map invalid model names to valid ones
      let claudeModel = model || 'claude-3-5-sonnet-20241022';
      if (model === 'claude-4-0' || model === 'claude-4') {
        claudeModel = 'claude-3-5-sonnet-20241022'; // Use latest Claude 3.5 Sonnet as fallback
        console.log('Invalid Claude model specified, using claude-3-5-sonnet-20241022 instead');
      }
      
      if (recentScreenshots.length > 0) {
        // Use vision analysis with screenshots
        response = await analyzeScreenshotsWithClaude(query, recentScreenshots, apiKey, claudeModel);
      } else {
        // Fallback to text-only analysis
        const axios = require('axios');
        const textResponse = await axios.post('https://api.anthropic.com/v1/messages', {
          model: claudeModel,
          max_tokens: 1000,
          messages: [{ role: 'user', content: query }]
        }, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        });
        response = textResponse.data.content[0].text;
      }
      
      return response;
    } else {
      throw new Error('Invalid AI provider specified');
    }
    
  } catch (error) {
    console.error('AI Search Error:', error);
    throw new Error(`AI Search failed: ${error.response?.data?.error?.message || error.message}`);
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

// Screenshot analysis functions
async function convertImageToBase64(imagePath) {
  try {
    const imageBuffer = await sharp(imagePath)
      .resize(1024, 768, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

async function getLastScreenshots(count = 1) {
  const screenshots = store.get('screenshots', []);
  console.log('Total screenshots in store:', screenshots.length);
  
  const recentScreenshots = screenshots
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, count);
    
  console.log('Recent screenshots before filtering:', recentScreenshots.length);
  
  const existingScreenshots = recentScreenshots.filter(screenshot => {
    // Use filepath instead of path
    const path = screenshot.filepath || screenshot.path;
    const exists = path && fs.existsSync(path);
    console.log(`Screenshot ${path} exists: ${exists}`);
    return exists;
  });
  
  console.log('Existing screenshots for analysis:', existingScreenshots.length);
  return existingScreenshots;
}

async function analyzeScreenshotsWithOpenAI(query, screenshots, apiKey) {
  const axios = require('axios');
  
  const imageMessages = await Promise.all(
    screenshots.map(async (screenshot) => {
      const imagePath = screenshot.filepath || screenshot.path;
      const base64Image = await convertImageToBase64(imagePath);
      return {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: "high"
        }
      };
    })
  );

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `I'm asking: "${query}"\n\nBased on this current screenshot from my work session, please provide a helpful response. Analyze what I'm currently working on, what applications I'm using, and provide relevant context for my question. If you can see specific text, code, or content in the screenshot, reference it in your response.`
        },
        ...imageMessages
      ]
    }
  ];

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: messages,
    max_tokens: 1500
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content;
}

async function analyzeScreenshotsWithClaude(query, screenshots, apiKey, model) {
  const axios = require('axios');
  
  const imageMessages = await Promise.all(
    screenshots.map(async (screenshot) => {
      const imagePath = screenshot.filepath || screenshot.path;
      const base64Image = await convertImageToBase64(imagePath);
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: base64Image
        }
      };
    })
  );

  const content = [
    {
      type: "text",
      text: `I'm asking: "${query}"\n\nBased on this current screenshot from my work session, please provide a helpful response. Analyze what I'm currently working on, what applications I'm using, and provide relevant context for my question. If you can see specific text, code, or content in the screenshot, reference it in your response.`
    },
    ...imageMessages
  ];

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: content }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content[0].text;
}

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
