// pearid test and playground
// Note: this is stitched with 'lib.js' and 'fake_keys.js' to create 'pearid_test.js'

// see fake_keys.js (make.lua)
function loadPublicKey() { return PUBLIC_KEY }
function loadPrivateKey() { return PRIVATE_KEY }

function _pearForm(form, elem) {
  if(elem.classList.contains('pearid-payload')) {
    form.payload = elem.value
  } else if(elem.classList.contains('pearid-signature')) {
    form.signature = elem.value
  } else {
    for(ch of elem.children) { _pearForm(form, ch) }
  }
}
function pearForm(formid) {
  var pearid = el('pearid')
  if(!pearid) {
    return "error: no pearid element"
  }
  var form = {
    payload: null,
    signature: null,
    pearid: pearid.value,
  }
  for(elem of el(formid).children) { _pearForm(form, elem) }
  return form
}
function pearFormButton(formid) {
  alert(JSON.stringify(pearForm(formid), null, 2))
}

async function showTest() {
  // some plaintext you want to sign
  const text = el('show-text').value
  log('showTest text: ' + text)

  var publicKey = loadPublicKey()
  var privKey   = loadPrivateKey()

  var s = await sign(text, privKey)
  el('signature').innerHTML = s

  var v = await verify(text, s, publicKey)
  el('verified').innerHTML = v + ''
}


async function test(name, fn) {
  log('TEST:', name)
  await fn()
  var results = el('test-results')
  var result = `<li><b>${name}</b>: <i>passed</i>\n`
  results.innerHTML += result
}

generateOptions = async function() {
  log('generating options')
  var pair = await createKeyPair()
  document.getElementById('public-key').value  = pair.publicKey
  document.getElementById('private-key').value = pair.privateKey
}

window.onload = async function() {
  showTest()
  el('show-text').addEventListener('change', showTest)

  document.getElementById('generate').addEventListener('click', generateOptions);

  log("pearid_test: onload")
  var publicKey = loadPublicKey()
  var privKey   = loadPrivateKey()

  await test('framework', async function() {})
  await test('export', async function() {
    var exportedPriv = await exportPrivateKey(
        await importSigningKey(privKey))
    assert(privKey.trim() == exportedPriv.trim())

    var exportedPub = await exportPublicKey(
        await importVerifyingKey(publicKey))
    assert(publicKey.trim() == exportedPub.trim())
  })
  await test('sign', async function() {
    var text = "this is a test"
    var s = await sign(text, privKey)
    assert(await verify(text, s, publicKey))
    assert(!await verify("this is 1 test", s, publicKey))
  })
  await test('forms', async function() {
    var forms = findForms();
    assert(forms.length == 2)
    var form0 = forms[0]
    log('payload', form0.payload)
    assert(form0.payload ===
      '[["inp1","Input to pearid"],["uuid","a-unique-id"]]')
    assert(form0.payloadEl)
    assert(form0.signatureEl)
  })
  await test('ALL PASS', async function() {})
  log("pearid_test: onload done")
}

// end of test.js
