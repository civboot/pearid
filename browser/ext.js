// extension
// Note: this is stitched with 'lib.js' to create 'itsame.js'

const storage = chrome.storage
const localStorage = storage.local

function privateFromStorage() {
  return new Promise((resolve) => {
    localStorage.get({ privateKey: ''},
      (items) => {
        resolve(items.privateKey)
      }
    )
  })
}

async function itsame(privateKey) {
  if(!subtle) {
    log("Subtle crypto not available, itsame exiting")
    return
  }
  for(form of findForms()) {
    if(form.payNode) { form.payNode.innerText = form.payload }
    if(form.sigNode) {
      var sig = await sign(form.payload, privateKey)
      form.sigNode.innerText = sig
    }
  }
}

privateFromStorage()
  .then(itsame)
  .catch(console.error)
