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
  // some plaintext you want to sign
  const text = 'The quick brown fox jumps over the lazy dog';

  var publicKey = loadPublicKey()
  var privKey   = await loadPrivateKey()

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
      '[["inp1","Input to itsame"],["uuid","a-unique-id"]]')
    assert(form0.payNode)
    assert(form0.sigNode)
  })
  log("itsame_test: onload done")
}

// end of test.js
