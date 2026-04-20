import './style.css'

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing required element: ${selector}`)
  }

  return element
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const availabilityStatus = requiredElement<HTMLElement>('#availabilityStatus')
const availabilityReason = requiredElement<HTMLElement>('#availabilityReason')
const statusLog = requiredElement<HTMLElement>('#statusLog')
const responseOutput = requiredElement<HTMLElement>('#responseOutput')
const promptForm = requiredElement<HTMLFormElement>('#promptForm')
const systemPromptInput = requiredElement<HTMLTextAreaElement>('#systemPrompt')
const userPromptInput = requiredElement<HTMLTextAreaElement>('#userPrompt')
const generateButton = requiredElement<HTMLButtonElement>('#generateButton')
const cancelButton = requiredElement<HTMLButtonElement>('#cancelButton')
const checkAvailabilityButton = requiredElement<HTMLButtonElement>('#checkAvailabilityButton')

if (!window.foundationModels) {
  throw new Error('window.foundationModels is not available. Check the Electron preload script.')
}

function updateAvailabilityBadge(status: string) {
  availabilityStatus.className = 'badge badge-outline'

  if (status === 'available') {
    availabilityStatus.classList.add('is-success')
    return
  }

  if (status === 'error') {
    availabilityStatus.classList.add('is-error')
    return
  }

  availabilityStatus.classList.add('is-warn')
}

function appendStatus(entry: string) {
  const timestamp = new Date().toLocaleTimeString()
  statusLog.textContent = `[${timestamp}] ${entry}\n${statusLog.textContent}`.trim()
}

function setBusy(isBusy: boolean) {
  generateButton.disabled = isBusy
  cancelButton.disabled = !isBusy
}

async function refreshAvailability() {
  appendStatus('Checking Foundation Models availability...')

  try {
    const result = await window.foundationModels.checkAvailability()
    availabilityStatus.textContent = result.status
    updateAvailabilityBadge(result.status)
    availabilityReason.textContent = result.reason || 'available'
    appendStatus(`Availability: ${result.status}${result.reason ? ` (${result.reason})` : ''}`)
  } catch (error) {
    const message = errorMessage(error)
    availabilityStatus.textContent = 'error'
    updateAvailabilityBadge('error')
    availabilityReason.textContent = message
    appendStatus(`Availability check failed: ${message}`)
  }
}

promptForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  responseOutput.textContent = ''
  setBusy(true)
  appendStatus('Sending prompt to Swift sidecar...')

  try {
    const result = await window.foundationModels.generate({
      systemPrompt: systemPromptInput.value.trim(),
      userPrompt: userPromptInput.value.trim(),
    })

    responseOutput.textContent = result.text || ''
    appendStatus('Response completed.')
  } catch (error) {
    const message = errorMessage(error)
    responseOutput.textContent = `Error: ${message}`
    appendStatus(`Generation failed: ${message}`)
  } finally {
    setBusy(false)
  }
})

cancelButton.addEventListener('click', async () => {
  try {
    await window.foundationModels.cancel()
    appendStatus('Cancellation requested.')
  } catch (error) {
    appendStatus(`Cancel failed: ${errorMessage(error)}`)
  }
})

checkAvailabilityButton.addEventListener('click', refreshAvailability)

window.foundationModels.onStatus((payload) => {
  appendStatus(`${payload.phase}: ${payload.message}`)
})

window.foundationModels.onResponse((payload) => {
  if (payload.kind === 'token') {
    responseOutput.textContent += payload.text
  }
})

window.foundationModels.onError((payload) => {
  appendStatus(`Bridge error: ${payload.message}`)
})

setBusy(false)
refreshAvailability()
