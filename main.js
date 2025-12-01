const { app, BrowserWindow, shell, ipcMain, nativeTheme } = require('electron/main')

app.commandLine.appendSwitch('--no-sandbox');

// IPC handler to get app path for accessing unpacked assets
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// IPC handler to get the OCR image path directly
ipcMain.handle('get-ocr-image-path', () => {
  const path = require('path');
  // In packaged app, unpacked files are in the same directory as the executable
  // Use path.dirname(process.execPath) for packaged apps, or app.getAppPath() for development
  const basePath = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
  return path.join(basePath, 'assets', 'OCR.png');
});

// IPC handler to get the Image Description default image path directly
ipcMain.handle('get-img-description-image-path', () => {
  const path = require('path');
  // In packaged app, unpacked files are in the same directory as the executable
  // Use path.dirname(process.execPath) for packaged apps, or app.getAppPath() for development
  const basePath = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
  return path.join(basePath, 'assets', 'ImgDescription-DefaultImg.png');
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
  // Open DevTools for debugging
  win.webContents.openDevTools();
  
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