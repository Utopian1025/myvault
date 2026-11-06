const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  setInteractive: (v) => ipcRenderer.send('set-interactive', !!v),
  save: (json) => ipcRenderer.sendSync('save-sync', json),
  load: () => ipcRenderer.invoke('load'),
  quit: () => ipcRenderer.send('quit'),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (v) => ipcRenderer.send('set-autostart', !!v),
  onCursor: (fn) => ipcRenderer.on('cursor', (_e, p) => fn(p)),
  onIdle: (fn) => ipcRenderer.on('idle', (_e, s) => fn(s)),
  onTray: (fn) => ipcRenderer.on('tray', (_e, c) => fn(c)),
  onKey: (fn) => ipcRenderer.on('key', () => fn()),
  onWheel: (fn) => ipcRenderer.on('wheel', (_e, d) => fn(d)),
  onAgent: (fn) => ipcRenderer.on('agent', (_e, m) => fn(m)),
  hookConfig: () => ipcRenderer.invoke('hook-config'),
});
