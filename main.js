import { app, BrowserWindow, shell, ipcMain, nativeTheme, dialog, Menu, utilityProcess } from 'electron/main';
import path from 'path';
import { MCPService } from './scripts/mcpService.js';

const __dirname = import.meta.dirname;

app.commandLine.appendSwitch('--no-sandbox');

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection in main process:', reason);
});

// Initialize MCP service
const mcpService = new MCPService();

// IPC handler to get app path for accessing unpacked assets
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// IPC handler for opening a file dialog (modal to the calling window)
ipcMain.handle('open-file-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return '';
  }
  return result.filePaths[0];
});

// IPC handler to get the OCR image path directly
ipcMain.handle('get-ocr-image-path', () => {
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
  if (app.isPackaged) {
    // In packaged app, unpacked assets are in resources/app.asar.unpacked/assets
    const resourcesPath = path.dirname(app.getAppPath());
    return path.join(resourcesPath, 'app.asar.unpacked', 'assets', 'ImgDescription-DefaultImg.png');
  } else {
    // Development mode
    return path.join(app.getAppPath(), 'assets', 'ImgDescription-DefaultImg.png');
  }
});

const SAMPLE_IMAGE_ALLOWLIST = new Set([
  'OCR.png',
  'ImgDescription-DefaultImg.png',
  'Road.png',
  'Enhance.png',
  'pose_default.png',
  'WinDev.png',
]);

ipcMain.handle('get-sample-image-path', (_event, name) => {
  if (typeof name !== 'string' || !SAMPLE_IMAGE_ALLOWLIST.has(name)) {
    throw new Error(`get-sample-image-path: unknown sample image "${name}"`);
  }
  if (app.isPackaged) {
    const resourcesPath = path.dirname(app.getAppPath());
    return path.join(resourcesPath, 'app.asar.unpacked', 'assets', name);
  }
  return path.join(app.getAppPath(), 'assets', name);
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
    if (!win.isDestroyed()) {
      win.webContents.send('window-focus-changed', true);
    }
  });
  win.on('blur', () => {
    updateTitleBarColors(false);
    if (!win.isDestroyed()) {
      win.webContents.send('window-focus-changed', false);
    }
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
  
  // Add context menu with Copy option when text is selected
  win.webContents.on('context-menu', (event, params) => {
    const menuItems = [];
    
    // Add Copy option if text is selected
    if (params.selectionText) {
      menuItems.push({
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      });
    }
    
    // Add Select All option
    menuItems.push({
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectAll'
    });
    
    // Only show menu if there are items
    if (menuItems.length > 0) {
      const contextMenu = Menu.buildFromTemplate(menuItems);
      contextMenu.popup();
    }
  });
}

app.whenReady().then(() => {
  startImageWorker()
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

// --- Image AI features in a utility process ----------------------------
// The three image features have synchronous WinRT compute steps that block
// the calling thread for several seconds. Running them in the Electron main
// process is not enough because the main process IS Chromium's browser
// process: it owns BrowserWindow HWNDs and pumps Windows messages, and
// blocking it stalls input and IPC delivery to the renderer. We isolate
// them in a utility process (a real OS child process) and forward IPC.

let imageWorker = null;
let imageWorkerReady = null;
const imageWorkerPending = new Map();
let imageWorkerNextId = 1;

function startImageWorker() {
  imageWorker = utilityProcess.fork(path.join(__dirname, 'image-worker.js'), [], {
    stdio: 'inherit',
    serviceName: 'image-worker',
  });

  imageWorker.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    const { id, ok, result, error } = msg;
    const entry = imageWorkerPending.get(id);
    if (!entry) return;
    imageWorkerPending.delete(id);
    if (ok) entry.resolve(result);
    else entry.reject(new Error(error || 'image-worker error'));
  });

  imageWorker.on('exit', (code) => {
    console.error(`[main] image-worker exited with code ${code}`);
    for (const entry of imageWorkerPending.values()) {
      entry.reject(new Error('image-worker exited'));
    }
    imageWorkerPending.clear();
    imageWorker = null;
  });

  imageWorkerReady = new Promise((resolve) => imageWorker.once('spawn', resolve));
}

async function callImageWorker(method, ...args) {
  if (!imageWorker) {
    if (!imageWorkerReady) throw new Error('image-worker not started');
    await imageWorkerReady;
  } else if (imageWorkerReady) {
    await imageWorkerReady;
  }
  return new Promise((resolve, reject) => {
    const id = imageWorkerNextId++;
    imageWorkerPending.set(id, { resolve, reject });
    imageWorker.postMessage({ id, method, args });
  });
}

ipcMain.handle('image:isImageScalerReady', () => callImageWorker('isImageScalerReady'));
ipcMain.handle('image:scaleImage', (_e, imagePath, w, h) => callImageWorker('scaleImage', imagePath, w, h));
ipcMain.handle('image:cancelScaleImage', () => callImageWorker('cancelScaleImage'));

ipcMain.handle('image:isImageObjectExtractorReady', () => callImageWorker('isImageObjectExtractorReady'));
ipcMain.handle('image:extractObject', (_e, imagePath, includePoints, excludePoints) =>
  callImageWorker('extractObject', imagePath, includePoints, excludePoints));
ipcMain.handle('image:cancelExtractObject', () => callImageWorker('cancelExtractObject'));

ipcMain.handle('image:isImageObjectRemoverReady', () => callImageWorker('isImageObjectRemoverReady'));
ipcMain.handle('image:removeObject', (_e, imagePath, rect) => callImageWorker('removeObject', imagePath, rect));
ipcMain.handle('image:cancelRemoveObject', () => callImageWorker('cancelRemoveObject'));