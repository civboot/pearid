// Note: lib.js is stitched with ext.js and test.js to create
// pearid.js and pearid_test.js.
// Why? Because I can't figure out way to import javascript
// in the file:// API (no, script<type="module">) does NOT work,
// and subtle doesn't exist if you are running an HTTP server.

// Useful docs:
// * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

function el(id) { return document.getElementById(id) }
assert = console.assert
log    = console.log
function loge(error) {
  log(`ERROR ${error}, stack: ${error.stack}`)
}

const NOID = "noid" // used as value of class=pearid
const crypto = window.crypto || window.msCrypto;
const subtle = crypto.subtle

// ---------------------------
// -- Utilities

// encode an ArrayBuffer (of ints) as a base64 String
const encodeB64 = (arrayBuffer) => {
  var byteArray = new Uint8Array(arrayBuffer)
  var byteString = []
  for (var i=0; i<byteArray.byteLength; i++) {
    byteString.push(String.fromCharCode(byteArray[i]));
  }
  return btoa(byteString.join(''));
}

// decode a base64 String as an ArrayBuffer (of ints)
const decodeB64 = (b64str) => {
  var byteStr = atob(b64str);
  var bytes = new Uint8Array(byteStr.length);
  for (var i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

// remove headers like "-----BEGIN PUBLIC KEY-----" and join lines.
const unfmtKey = (pem) => {
  var lines = pem.split('\n');
  var encoded = []
  for(var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('--') < 0) {
      encoded.push(lines[i].trim())
    }
  }
  return encoded.join('')
}

const fmtKey = (header, key) => {
  var lines = [`-----BEGIN ${header} KEY-----`]
  var i = 0; while(i < key.length) {
    lines.push(key.slice(i, i + 64))
    i = i + 64
  }
  lines.push(`-----END ${header} KEY-----`)
  return lines.join('\n')
}

// ---------------------------
// -- Crypto Utils

const exportPublicKey = async (publicKey) => {
  var exported = await subtle.exportKey("spki", publicKey)
  return fmtKey("PUBLIC", encodeB64(exported))
}
const exportPrivateKey = async (privateKey) => {
  var exported = await subtle.exportKey("pkcs8", privateKey)
  return fmtKey("PRIVATE", encodeB64(exported))
}
const createKeyPair = async() => {
  var pair = await subtle.generateKey(
    RSA_PSS_PAIR, true, ["sign", "verify"])
  return {
    publicKey: await exportPublicKey(pair.publicKey),
    privateKey: await exportPrivateKey(pair.privateKey),
  }
}

// ---------------------------
// -- Sign / Verify

const RSA_PSS = {
  name: "RSA-PSS",
  hash: { name: "SHA-256" }
};
const RSA_PSS_PARAMS = {
  name: "RSA-PSS",
  saltLength: 32, // 256 bit
}
const RSA_PSS_PAIR = {
  name: "RSA-PSS",
  modulusLength: 4096,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: "SHA-256",
}

const importKey_RSA_PSS = async (key, format, keyUsages) => {
  var cleanKey = unfmtKey(key)

  try {
    return await crypto.subtle.importKey(
      format,
      decodeB64(cleanKey),
      RSA_PSS,
      true,
      keyUsages);
  } catch(e) {
    loge(e)
    throw e
  }
}

// spki is public only
const importVerifyingKey = async (key) => {
  return importKey_RSA_PSS(key, "spki", ["verify"])
}
const importSigningKey = async (key) => {
  return importKey_RSA_PSS(key, "pkcs8", ["sign"])
}

const sign = async(text, privateKey) => {
  var key; try { key = await importSigningKey(privateKey)
  } catch(e) {
    loge(e)
    throw e
  }

  const signatureBuf = await subtle.sign(
    RSA_PSS_PARAMS,
    key,
    new TextEncoder().encode(text))
  return encodeB64(signatureBuf)
}

verify = async (text, signature, publicKey) => {
  const key = await importVerifyingKey(publicKey)
  return await subtle.verify(
    RSA_PSS_PARAMS,
    key,
    decodeB64(signature),
    new TextEncoder().encode(text))
}

// ---------------------------
// -- Encrypt / Decrypt

const RSA_OAEP = {
    name: "RSA-OAEP",
    hash: { name: "SHA-256" }
};

async function importKey_RSA_OAEP(key, format, keyUsages) {
  var cleanKey = unfmtKey(key)
  return await crypto.subtle.importKey(
    format,
    decodeB64(cleanKey),
    RSA_OAEP,
    false,
    keyUsages);
}
async function pubEncryptKey(key) {
  return importKey_RSA_OAEP(key, "spki", ["encrypt"])
}
async function privateEncryptKey(key) {
  return importKey_RSA_OAEP(key, "pkcs8", ["decrypt"])
}

encrypt = async function(text, publicKey) {
  const encrypted = await subtle.encrypt(
    RSA_OAEP,
    await pubEncryptKey(publicKey),
    new TextEncoder().encode(text))
  return encodeB64(encrypted)
}

// Decrypt a string in b64 of form
decrypt = async function(encrypted, privateKey) {
  const key = await privateEncryptKey(privateKey)
  const text = await subtle.decrypt(RSA_OAEP, key, decodeB64(encrypted))
  return new TextDecoder().decode(text);
}

// ---------------------------
// -- Load / Store

getKeysFromStorage = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get({ privateKey: '', publicKey: ''}, resolve)
  })
}

setKeysInStorage = () => {
  return new Promise((resolve) => {
    chrome.storage.local.set(keys, resolve)
  })
}

// ---------------------------
// -- Html Processing

// Recursively find the relevant elements
// res: result created in processForm, e: element
processFormChild = (res, e) => {
  var cl = e.classList; if(!cl) {} // skip
  else if(cl.contains('pearid-value')) {
    res.valueEls.push(e)
    res.payload.push([e.name ? e.name : "", e.value])
    return
  } else if(cl.contains('pearid-signature')) {
    res.signatureEl = e; return;
  } else if(cl.contains('pearid-payload'))   {
    res.payloadEl = e; return;
  }
  for(child of e.childNodes) {
    processFormChild(res, child)
  }
}

processForm = (form) => {
  var res = {
    payload: [],
    signatureEl: null, payloadEl: null, valueEls: [],
  }

  for(e of form.children) { processFormChild(res, e) }
  var hasUuid = false; for(p of res.payload) {
    if(p[0] == 'uuid') { hasUuid = true; break }
  }
  if(!hasUuid) {
    throw new Error('invalid page: missing name="uuid" pearid-value in pearid-form')
  }
  res.payload = JSON.stringify(res.payload)
  return res
}

findForms = () => {
  var forms = []
  for(form of document.getElementsByClassName('pearid-form')) {
    var form = processForm(form)
    forms.push(form)
  }
  return forms
}

const updateSignatures = async (_ev) => {
  if(!subtle) {
    log("pearid: subtle crypto not available. Exiting")
    return
  }
  var id = el('pearid')
  if (!id
      || (typeof id.value == 'undefined')
      || (id.value.trim() == NOID)) { return }

  let keys = await getKeysFromStorage()
  if(id.value.trim() != keys.publicKey.trim()) {
    var msg = "PearID: okay to share your identity with webpage?"
    if(confirm(msg)) { id.value = keys.publicKey }
    else             { id.value = NOID; return }
  }
  for(form of findForms()) {
    if(form.payloadEl) {
      form.payloadEl.value = form.payload }
    if(form.signatureEl) {
      var sig = await sign(form.payload, keys.privateKey)
      form.signatureEl.value = sig
    }
  }
}

// Add listeners to id=pearid and the class=pearid-value elements.
//
// Whenever they change they cause a global resign
const addChangeListeners = () => {
  if(!subtle) { return }
  var pearid = el('pearid'); if(!pearid) { return }
  pearid.addEventListener('change', updateSignatures)

  for(form of findForms()) {
    for(valueEl of form.valueEls) {
      valueEl.addEventListener('change', updateSignatures)
    }
  }
}

const decryptElement = async (elem, privateKey) => {
  let eclass = 'pearid-encrypted'
  let cl = elem.classList; assert(cl.contains(eclass))
  try {
    log('decrypting', elem.innerText)
    var decrypted = await decrypt(elem.innerText, privateKey)
  } catch (e) {
    cl.replace(eclass, 'pearid-error')
    cl.innerText = 'decryption failed'
    return
  }
  elem.innerHTML = decrypted
  cl.replace('pearid-encrypted', 'pearid-decrypted')
}

const decryptAll = async (privateKey) => {
  for(el of document.getElementsByClassName('pearid-encrypted')) {
    await decryptElement(el, privateKey)
  }
  return forms

}


PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtzcl8NAgurtbeEajVv/+
r+mIV/OhCFIC71PnMljUrlNSoOBqiza9B99gUNX/mBudt/Cyrfs23L1Coo5jqRpe
VN/LIIuk0Hf63z6fOVYVS1ucQ/zMSwz1356UpckoxUm5mQ8/yqhOJNwn/1waJb8S
DTKrN6/uI/zTEbV5y4/fM3NNBeDRSlt0Lf4QoywjJLgPkpnVzkElrUUX+uUrIvbw
mA7fFc96efo9i9zej7uyND9hVPuPRoJqIEfEfN6dEDNA3T0EKE6soXujPMhvBxz2
bfvNoY4DWWdXDOfHkub7cwo4wLUTnl9kRVZTA/y8IS+S9jnMNrvucuXqNirFq3Ef
KnD7VqWKm87ljd5N9Wb3ZKQRboDQsgCcqvINHCrjckFL9BF/ZJc40q3W83svqm8j
pMcjkU6whpKjJKEqiQvg7Sn0mbnlHcyBIFfcT2ZFWK+I65WmRx2VZ4qtTpnwIJy5
I3IIDDZ166KBG7waJjgokOZu5wvIuZU5jz28qxKhLVi7u4nhLIVhxBrDcbBe7NYI
U4+XMswGxe+PPqWRUYH3VtcE/zo+0vcvbKX10n96lPSphyNb24Vix3r+omUgmd7C
b7SvWBm1kOFeP5QTMcxSqgAinfuR2wXrzoNmRseWO9W5NY1Aaz4fcjAAOuzTlAE1
YjdzufQ1pWUZfJ7UazSFbeECAwEAAQ==
-----END PUBLIC KEY-----
`

PRIVATE_KEY = `
-----BEGIN PRIVATE KEY-----
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
e+7x3qE0VcHyFIvH3hW1NQLhuLVmOQ==
-----END PRIVATE KEY-----
`

ENCRYPTED = `

`.replace(/\s/g, "")

// pearid test and playground
// Note: this is stitched with 'lib.js' and 'fake_keys.js' to create 'pearid_test.js'

// see fake_keys.js (make.lua)
function loadPublicKey()  { return PUBLIC_KEY }
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

  var pubKey  = loadPublicKey()
  var privKey = loadPrivateKey()

  var s = await sign(text, privKey)
  el('signature').innerHTML = s

  var v = await verify(text, s, pubKey)
  el('verified').innerHTML = v + ''

  var elem = el('encrypt-then-decrypt')
  var e = await encrypt(elem.innerHTML, pubKey)
  assert(e != elem.innerHTML)
  elem.innerText = e
  await decryptElement(elem, privKey)

  var r = el('replace-class')
  log('replace:', r, r.classList)
  assert(r.classList.contains('old-class'))
  r.classList.replace('old-class', 'new-class')
  assert(r.innerText == 'This is the old data')
  r.innerHTML = 'This is the <b>new</b> data'
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
  var pubKey  = loadPublicKey()
  var privKey = loadPrivateKey()

  await test('framework', async function() {})
  await test('export', async function() {
    var exportedPriv = await exportPrivateKey(
        await importSigningKey(privKey))
    assert(privKey.trim() == exportedPriv.trim())

    var exportedPub = await exportPublicKey(
        await importVerifyingKey(pubKey))
    assert(pubKey.trim() == exportedPub.trim())
  })
  await test('sign', async function() {
    var text = "this is a test"
    var s = await sign(text, privKey)
    assert(await verify(text, s, pubKey))
    assert(!await verify("this is 1 test", s, pubKey))
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
  await test('encrypt', async function() {
    var text = 'encrypted text'
    var e = await encrypt(text, pubKey)
    assert(text != e)
    var d = await decrypt(e, privKey)
    assert(d == text)
  })
  await test('ALL PASS', async function() {})
  log("pearid_test: onload done")
}

// end of test.js
