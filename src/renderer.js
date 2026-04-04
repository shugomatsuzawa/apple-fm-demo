const availabilityStatus = document.querySelector('#availabilityStatus');
const availabilityReason = document.querySelector('#availabilityReason');
const statusLog = document.querySelector('#statusLog');
const responseOutput = document.querySelector('#responseOutput');
const promptForm = document.querySelector('#promptForm');
const systemPromptInput = document.querySelector('#systemPrompt');
const userPromptInput = document.querySelector('#userPrompt');
const generateButton = document.querySelector('#generateButton');
const cancelButton = document.querySelector('#cancelButton');
const checkAvailabilityButton = document.querySelector('#checkAvailabilityButton');

function appendStatus(entry) {
  const timestamp = new Date().toLocaleTimeString();
  statusLog.textContent = `[${timestamp}] ${entry}\n${statusLog.textContent}`.trim();
}

function setBusy(isBusy) {
  generateButton.disabled = isBusy;
  cancelButton.disabled = !isBusy;
}

async function refreshAvailability() {
  appendStatus('Checking Foundation Models availability...');
  try {
    const result = await window.foundationModels.checkAvailability();
    availabilityStatus.textContent = result.status;
    availabilityReason.textContent = result.reason || 'available';
    appendStatus(`Availability: ${result.status}${result.reason ? ` (${result.reason})` : ''}`);
  } catch (error) {
    availabilityStatus.textContent = 'error';
    availabilityReason.textContent = error.message;
    appendStatus(`Availability check failed: ${error.message}`);
  }
}

promptForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  responseOutput.textContent = '';
  setBusy(true);
  appendStatus('Sending prompt to Swift sidecar...');

  try {
    const result = await window.foundationModels.generate({
      systemPrompt: systemPromptInput.value.trim(),
      userPrompt: userPromptInput.value.trim(),
    });

    responseOutput.textContent = result.text || '';
    appendStatus('Response completed.');
  } catch (error) {
    responseOutput.textContent = `Error: ${error.message}`;
    appendStatus(`Generation failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

cancelButton.addEventListener('click', async () => {
  try {
    await window.foundationModels.cancel();
    appendStatus('Cancellation requested.');
  } catch (error) {
    appendStatus(`Cancel failed: ${error.message}`);
  }
});

checkAvailabilityButton.addEventListener('click', refreshAvailability);

window.foundationModels.onStatus((payload) => {
  appendStatus(`${payload.phase}: ${payload.message}`);
});

window.foundationModels.onResponse((payload) => {
  if (payload.kind === 'token') {
    responseOutput.textContent += payload.text;
  }
});

window.foundationModels.onError((payload) => {
  appendStatus(`Bridge error: ${payload.message}`);
});

setBusy(false);
refreshAvailability();
