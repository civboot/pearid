// extension
// Note: this is stitched with 'lib.js' to create 'pearid.js'

const storage = chrome.storage
const localStorage = storage.local

async function pearid(keys) {
  if(!subtle) {
    log("pearid: exiting, subtle crypto not available")
    return
  }
  var id = el('pearid')
  if (!id || (typeof id.value == 'undefined')) { return }
  else if (id.value == NOID) { return; }
  else if(id.value.trim() != keys.publicKey.trim()) {
    var msg = "PearID: okay to share your identity?"
    if(confirm(msg)) { id.value = keys.publicKey }
    else             { id.value = NOID; return }
  }
  log("finding forms")
  for(form of findForms()) {
    log("found form", form)
    if(form.payloadEl) {
      log("form payloadEl:", form.payloadEl)
      form.payloadEl.value = form.payload }
    if(form.signatureEl) {
      log("form signatureEl:", form.signatureEl)
      var sig = await sign(form.payload, keys.privateKey)
      form.signatureEl.value = sig
    }
  }
}

getKeysFromStorage()
  .then(pearid)
  .catch(console.error)
