// desktop/main.js - Electron shell for the same web/ app the phone runs.
//
// Security posture: the page has no Node access (nodeIntegration off, contextIsolation on, sandbox on). The only
// things it can ask the shell to do are the two a WebView cannot do on its own: save a file through the system
// dialog, and print. Everything else - storage, screens, accounting - is the web app.
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;

function createWindow(){
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 640,
    title: 'Bookkeep',
    backgroundColor: '#0B120F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, '..', 'web', 'index.html'));
  win.on('closed', () => { win = null; });
}

// Save exactly as the phone's Saver bridge does: the page hands over text or base64 bytes and gets the truth
// back, so an export never claims a file it did not write.
ipcMain.handle('save-file', async (_e, { name, text, base64, mime } = {}) => {
  try {
    const r = await dialog.showSaveDialog(win, { defaultPath: name || 'bookkeep-export' });
    if (r.canceled || !r.filePath) return false;
    if (typeof base64 === 'string') fs.writeFileSync(r.filePath, Buffer.from(base64, 'base64'));
    else fs.writeFileSync(r.filePath, String(text == null ? '' : text), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('print-page', async () => {
  if (!win) return false;
  return new Promise((resolve) => {
    win.webContents.print({ silent: false, printBackground: true }, (ok) => resolve(!!ok));
  });
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Bookkeep', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'quit' }
    ]},
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }] }
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
