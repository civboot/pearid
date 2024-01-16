// extension
// Note: this is stitched with 'lib.js' to create 'itsame.js'

const storage = chrome.storage
const localStorage = storage.local

function privateFromStorage() {
  return new Promise((resolve) => {
    log('in promise', localStorage)
    localStorage.get({ privateKey: ''},
      (items) => {
        log('resolving promise', items.privateKey)
        resolve(items.privateKey)
        log('resolved promise')
      }
    )
  })
}

async function itsame(privateKey) {
  log('resolved privatekey')
  log("in itsame function")
  for(form of findForms()) {
    log("got form:", form)
    if(form.payNode) { form.payNode.innerText = form.payload }
    if(form.sigNode) {
      log("signing:", form.payload)
      var sig = await sign(form.payload, privateKey)
      log("signing form")
      form.sigNode.innerText = sig
    }
  }
}

privateFromStorage()
  .then(itsame)
  .catch(console.error)
