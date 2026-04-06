const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { SwiftBridge } = require('./swift-bridge');

let mainWindow;
let bridge;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: 'Apple Foundation Models Demo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // デバッグ用
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  }
}

app.whenReady().then(async () => {
  bridge = new SwiftBridge({
    packagePath: path.join(__dirname, '..', 'swift-bridge'),
  });

  bridge.on('status', (payload) => {
    mainWindow?.webContents.send('fm:status', payload);
  });

  bridge.on('response', (payload) => {
    mainWindow?.webContents.send('fm:response', payload);
  });

  bridge.on('error', (payload) => {
    mainWindow?.webContents.send('fm:error', payload);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle('fm:check-availability', async () => bridge.checkAvailability());
ipcMain.handle('fm:generate', async (_event, payload) => bridge.generate(payload));
ipcMain.handle('fm:cancel', async () => bridge.cancel());

app.on('window-all-closed', async () => {
  await bridge?.dispose();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await bridge?.dispose();
});
