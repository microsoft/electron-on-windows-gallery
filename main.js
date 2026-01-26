const { app, BrowserWindow, shell, ipcMain, nativeTheme } = require('electron/main')
const { MCPService } = require('./scripts/mcpService')

app.commandLine.appendSwitch('--no-sandbox');

// Initialize MCP service
const mcpService = new MCPService();

// IPC handler to get app path for accessing unpacked assets
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// IPC handler to get the OCR image path directly
ipcMain.handle('get-ocr-image-path', () => {
  const path = require('path');
  if (app.isPackaged) {
    // In packaged app, unpacked assets are in resources/app.asar.unpacked/assets
    const resourcesPath = path.dirname(app.getAppPath());
    return path.join(resourcesPath, 'app.asar.unpacked', 'assets', 'OCR.png');
  } else {
    // Development mode
    return path.join(app.getAppPath(), 'assets', 'OCR.png');
  }
});

// IPC handler to get the Image Description default image path directly
ipcMain.handle('get-img-description-image-path', () => {
  const path = require('path');
  if (app.isPackaged) {
    // In packaged app, unpacked assets are in resources/app.asar.unpacked/assets
    const resourcesPath = path.dirname(app.getAppPath());
    return path.join(resourcesPath, 'app.asar.unpacked', 'assets', 'ImgDescription-DefaultImg.png');
  } else {
    // Development mode
    return path.join(app.getAppPath(), 'assets', 'ImgDescription-DefaultImg.png');
  }
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1072,
    height: 640,
    autoHideMenuBar: true, // Hide the menu bar (can be toggled with Alt key)
    // Alternatively, use: frame: false, // Removes the entire title bar and menu
    titleBarStyle: 'hidden',
    titleBarOverlay: true,
    backgroundColor: '#00000000', // Transparent background to show Mica
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js',
      sandbox: false,
      // Do NOT set sandbox: true
    }
  })
  
  // Enable Windows Mica material
  win.setBackgroundMaterial('mica')
  
  // Function to update titlebar colors based on system theme and focus state
  const updateTitleBarColors = (isFocused = true) => {
    const isDark = nativeTheme.shouldUseDarkColors;
    const baseColor = isDark ? '#ffffff' : '#242424';
    
    win.setTitleBarOverlay({
      color: '#00000000', // Transparent to show Mica material
      symbolColor: isFocused ? baseColor : (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(36, 36, 36, 0.5)'),
      height: 49 // 1px less than CSS height to avoid visual glitch
    });
  };
  
  // Set initial titlebar colors
  updateTitleBarColors(win.isFocused());
  
  // Update titlebar colors when system theme changes
  nativeTheme.on('updated', () => updateTitleBarColors(win.isFocused()));
  
  // Update titlebar colors when window focus changes
  win.on('focus', () => {
    updateTitleBarColors(true);
    win.webContents.send('window-focus-changed', true);
  });
  win.on('blur', () => {
    updateTitleBarColors(false);
    win.webContents.send('window-focus-changed', false);
  });

  win.loadFile('index.html')
  
  // Only open DevTools in development mode
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
  
  // Disable DevTools keyboard shortcuts in production
  if (app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (input.key === 'F12' || 
          (input.control && input.shift && (input.key === 'I' || input.key === 'i' || input.key === 'J' || input.key === 'j' || input.key === 'C' || input.key === 'c'))) {
        event.preventDefault();
      }
    });
  }
  
  // Handle external links - prevent them from opening in new Electron windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers for MCP operations
ipcMain.handle('mcp:fetchServers', async () => {
  try {
    const servers = await mcpService.fetchServerList();
    return { success: true, servers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:connectToServer', async (event, server) => {
  try {
    console.log('[IPC] mcp:connectToServer called for:', server.name);
    const result = await mcpService.connectToServer(server);
    console.log('[IPC] Connected successfully');
    return { success: true, ...result };
  } catch (error) {
    console.error('[IPC] Connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:listTools', async () => {
  try {
    const tools = await mcpService.listTools();
    return { success: true, tools };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:callTool', async (event, toolName, parameters) => {
  try {
    const result = await mcpService.callTool(toolName, parameters);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:disconnect', async () => {
  try {
    await mcpService.disconnect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:isConnected', async () => {
  return { connected: mcpService.isConnected() };
});