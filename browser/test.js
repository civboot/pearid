// itsame test and playground
// Note: this is stitched with 'lib.js' to create 'itsame_test.js'

function loadPublicKey() {
  var fake = el('itsame-fake-public-key'); if(fake) {
    return fake.innerText;
  }
}

async function loadPrivateKey() {
  var fake = el('itsame-fake-private-key'); if(fake) {
    return fake.innerText;
  }
}

async function showTest() {
  // some plaintext you want to encrypt
  const text = 'The quick brown fox jumps over the lazy dog';

  // create or bring your own base64-encoded encryption key
  // const key = encodeB64(
  //   crypto.getRandomValues(new Uint8Array(32))
  // )
  var publicKey = loadPublicKey()
  var privKey   = await loadPrivateKey()

  var e = await encrypt(text, publicKey)
  el('encrypted').innerHTML = `
  <p>iv=${e.iv}</p>
  <p>${e.ciphertext}</p>`
  var d = await decrypt(e.ciphertext, e.iv, privKey)
  el('decrypted').innerHTML = d

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

window.onload = async function() {
  log("itsame_test: onload")
  await showTest()
  var publicKey = loadPublicKey()
  var privKey   = await loadPrivateKey()

  await test('framework', async function() {})
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
      '[["inp1","Input to itsame"],["uuid","a-unique-id"]]')
    assert(form0.payNode)
    assert(form0.sigNode)
  })
  log("itsame_test: onload done")
}

// end of test.js
