generateOptions = async function() {
  log('generating options')
  var pair = await createKeyPair()
  document.getElementById('public-key').value  = pair.publicKey
  document.getElementById('private-key').value = pair.privateKey
}

// Saves options to chrome.storage
const saveOptions = () => {
  const publicKey = document.getElementById('public-key').value
  const privateKey = document.getElementById('private-key').value

  chrome.storage.local.set(
    {
      publicKey: publicKey,
      privateKey: privateKey,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.local.get(
    {
      privateKey: '',
      publicKey: '',
    },
    (items) => {
      document.getElementById('public-key').value = items.publicKey
      document.getElementById('private-key').value = items.privateKey
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
el('save').addEventListener('click', saveOptions);
el('generate').addEventListener('click', generateOptions);
el('public-file').addEventListener('change', async () => {
  el('public-key').value = await el('public-file').files[0].text()
})
el('private-file').addEventListener('change', async () => {
  el('private-key').value = await el('private-file').files[0].text()
})
