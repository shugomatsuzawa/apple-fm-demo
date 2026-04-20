"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // You can expose other APTs you need here.
  checkAvailability: () => ipcRenderer.invoke('fm:check-availability'),
  generate: (payload) => ipcRenderer.invoke('fm:generate', payload),
  cancel: () => ipcRenderer.invoke('fm:cancel'),
  onStatus: (callback) => ipcRenderer.on('fm:status', (_event, payload) => callback(payload)),
  onResponse: (callback) => ipcRenderer.on('fm:response', (_event, payload) => callback(payload)),
  onError: (callback) => ipcRenderer.on('fm:error', (_event, payload) => callback(payload)),
});
