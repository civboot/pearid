// extension
// Note: this is stitched with 'lib.js' to create 'itsame.js'

log('itsame.js loading')

var privateKey = loadPrivateKey()

async function itsame() {
  log("in itsame function")
  for(form of findForms()) {
    if(form.payNode) { form.payNode.innerText = form.payload }
    if(form.sigNode) {
      var sig = await sign(form.payload, privateKey)
      log("signing form")
      form.sigNode.innerText = sig
    }
  }
}

itsame()

log('itsame.js done')
