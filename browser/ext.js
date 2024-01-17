// extension
// Note: this is stitched with 'lib.js' to create 'pearid.js'

const storage = chrome.storage
const localStorage = storage.local

async function pearid(keys) {
  if(!subtle) {
    log("Subtle crypto not available, pearid exiting")
    return
  }
  for(form of findForms()) {
    if(form.payNode) { form.payNode.innerText = form.payload }
    if(form.sigNode) {
      var sig = await sign(form.payload, keys.privateKey)
      form.sigNode.innerText = sig
    }
  }
}

getKeysFromStorage()
  .then(pearid)
  .catch(console.error)
