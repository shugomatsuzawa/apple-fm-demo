const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foundationModels', {
  checkAvailability: () => ipcRenderer.invoke('fm:check-availability'),
  generate: (payload) => ipcRenderer.invoke('fm:generate', payload),
  cancel: () => ipcRenderer.invoke('fm:cancel'),
  onStatus: (callback) => ipcRenderer.on('fm:status', (_event, payload) => callback(payload)),
  onResponse: (callback) => ipcRenderer.on('fm:response', (_event, payload) => callback(payload)),
  onError: (callback) => ipcRenderer.on('fm:error', (_event, payload) => callback(payload)),
});
