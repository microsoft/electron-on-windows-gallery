const { app, BrowserWindow, shell, ipcMain } = require('electron/main')

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
    width: 800,
    height: 600,
    autoHideMenuBar: true, // Hide the menu bar (can be toggled with Alt key)
    // Alternatively, use: frame: false, // Removes the entire title bar and menu
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js',
      sandbox: false,
      // Do NOT set sandbox: true
    }
  })

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