// desktop/main.js - Electron shell for the same web/ app the phone runs.
//
// Security posture: the page has no Node access (nodeIntegration off, contextIsolation on, sandbox on). The only
// things it can ask the shell to do are the two a WebView cannot do on its own: save a file through the system
// dialog, and print. Everything else - storage, screens, accounting - is the web app.
const { app, BrowserWindow, ipcMain, dialog, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win = null;

// In development the shell reads ../web directly, so there is never a second copy of the screens. A packaged
// build carries that folder beside the executable (see build.js), so the same files travel with the app.
const webIndex = () => app.isPackaged
  ? path.join(process.resourcesPath, 'web', 'index.html')
  : path.join(__dirname, '..', 'web', 'index.html');

function createWindow(){
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 640,
    title: 'Bookkeep',
    backgroundColor: '#0B120F',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(webIndex());
  if (process.argv.includes('--smoke-max')) win.maximize();
  // Chromium occasionally leaves a strip of the previous frame along an edge after a maximise/resize. Forcing a
  // repaint when the size settles clears it; it costs nothing and it is why the strip should not reappear.
  win.on('resize', () => {
    clearTimeout(win.__repaint);
    win.__repaint = setTimeout(() => { try { win.webContents.invalidate(); } catch (e) {} }, 120);
  });
  win.on('closed', () => { win = null; });
  // --smoke exists so the build can prove the window really loads the app: it captures the first screen, writes
  // it to the temp folder and exits. It changes nothing about how the app runs normally.
  if (process.argv.includes('--smoke')) {
    win.webContents.once('did-finish-load', () => {
      // --smoke-app signs in and opens the dashboard, so the desktop *layout* can be inspected, not just the
      // login screen. It exists for verification and changes nothing otherwise.
      if (process.argv.includes('--smoke-app')) {
        const tabArg = (process.argv.find(a => a.startsWith('--smoke-tab=')) || '--smoke-tab=dash').split('=')[1];
        setTimeout(() => {
          win.webContents.executeJavaScript(
            "(async()=>{try{if(USERS.length){const r=await signInHashed(USERS[0].id,'1234');if(!r.ok)throw new Error(r.reason)}S.screen=null;S.tab='" + tabArg + "';render()}catch(e){document.title='ERR '+e.message}})()"
          ).catch(() => {});
        }, 1200);
      }
      setTimeout(async () => {
        try {
          // A one-line layout readout, so a screenshot can be checked against what the CSS actually computed.
          const info = await win.webContents.executeJavaScript(
            "(()=>{const c=document.querySelector('.scr .card');const s=c?getComputedStyle(c):null;return {app:document.getElementById('app').className,cardWidth:s&&s.width,marginLeft:s&&s.marginLeft,hasNavClass:document.getElementById('app').className.includes('hasnav')}})()"
          );
          console.log('SMOKE_INFO=' + JSON.stringify(info));
          const img = await win.webContents.capturePage();
          const out = path.join(os.tmpdir(), 'bookkeep-desktop-smoke.png');
          fs.writeFileSync(out, img.toPNG());
          console.log('SMOKE_SCREENSHOT=' + out);
        } catch (e) {
          console.log('SMOKE_FAILED ' + e.message);
        } finally {
          app.quit();
        }
      }, process.argv.includes('--smoke-app') ? 6000 : 2500);
    });
  }
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

// One process, one window. Two copies of the app would each keep their own copy of the book in browser storage
// and quietly write over each other - and the second one is also what shows as a strip of another window at the
// edge of the first. A second launch focuses the window that is already open.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });

  app.whenReady().then(async () => {
    // While developing, a cached stylesheet would hide every change until the profile was wiped. A packaged build
    // keeps its cache: its files only change when the app is installed again.
    if (!app.isPackaged) { try { await session.defaultSession.clearCache(); } catch (e) {} }
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
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
