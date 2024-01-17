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
// -- Crypto Stuff

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

const exportPublicKey = async (verifyingKey) => {
  var exported = await subtle.exportKey("spki", verifyingKey)
  return fmtKey("PUBLIC", encodeB64(exported))
}
const exportPrivateKey = async (signingKey) => {
  var exported = await subtle.exportKey("pkcs8", signingKey)
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

// extension
// Note: this is stitched with 'lib.js' to create 'pearid.js'

addChangeListeners()
updateSignatures()
