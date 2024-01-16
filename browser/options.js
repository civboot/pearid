// Saves options to chrome.storage
const saveOptions = () => {
  const privateKey = document.getElementById('private-key').value

  chrome.storage.local.set(
    {
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
    },
    (items) => {
      document.getElementById('private-key').value = items.privateKey
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
