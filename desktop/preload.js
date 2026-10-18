// desktop/preload.js - the only bridge between the page and the shell.
// Mirrors the Android MainActivity bridges the web app already looks for, so ui/kit.js needs no desktop branch.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Saver', {
  save: (name, text, mime) => ipcRenderer.invoke('save-file', { name, text, mime }),
  saveBytes: (name, base64, mime) => ipcRenderer.invoke('save-file', { name, base64, mime })
});

contextBridge.exposeInMainWorld('Printer', {
  printPage: () => ipcRenderer.invoke('print-page')
});
