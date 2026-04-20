/// <reference types="vite/client" />

interface FoundationModelsBridge {
  checkAvailability: () => Promise<{ status: string; reason?: string }>
  generate: (payload: { systemPrompt: string; userPrompt: string }) => Promise<{ text?: string }>
  cancel: () => Promise<{ text?: string }>
  onStatus: (callback: (payload: { phase: string; message: string }) => void) => void
  onResponse: (callback: (payload: { kind: string; text: string }) => void) => void
  onError: (callback: (payload: { message: string }) => void) => void
}

interface Window {
  foundationModels: FoundationModelsBridge
}
