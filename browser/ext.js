// extension
// Note: this is stitched with 'lib.js' to create 'pearid.js'

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

async function pearid(privateKey) {
  if(!subtle) {
    log("Subtle crypto not available, pearid exiting")
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
  .then(pearid)
  .catch(console.error)
