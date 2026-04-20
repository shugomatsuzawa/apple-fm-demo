import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('foundationModels', {
  checkAvailability: () => ipcRenderer.invoke('fm:check-availability'),
  generate: (payload: { systemPrompt: string; userPrompt: string }) => ipcRenderer.invoke('fm:generate', payload),
  cancel: () => ipcRenderer.invoke('fm:cancel'),
  onStatus: (callback: (payload: { phase: string; message: string }) => void) =>
    ipcRenderer.on('fm:status', (_event, payload) => callback(payload)),
  onResponse: (callback: (payload: { kind: string; text: string }) => void) =>
    ipcRenderer.on('fm:response', (_event, payload) => callback(payload)),
  onError: (callback: (payload: { message: string }) => void) =>
    ipcRenderer.on('fm:error', (_event, payload) => callback(payload)),
})
