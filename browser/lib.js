// Note: lib.js is stitched with ext.js and test.js to create
// itsame.js and itsame_test.js.
// Why? Because I can't figure out way to import javascript
// in the file:// API (no, script<type="module">) does NOT work,
// and subtle doesn't exist if you are running an HTTP server.

// Useful docs:
// * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

function el(id) { return document.getElementById(id) }
assert = console.assert
log    = console.log

const crypto = window.crypto || window.msCrypto;
const subtle = crypto.subtle

assert(subtle, "SubtleCrypto not available")

const RSA_OAEP = {
  name: "RSA-OAEP",
  hash: { name: "SHA-256" }
};
const RSA_PSS = {
  name: "RSA-PSS",
  hash: { name: "SHA-256" }
};
const RSA_PSS_PARAMS = {
  name: "RSA-PSS",
  saltLength: 32, // 256 bit
}

function loadPublicKey() {
  var fake = el('itsame-fake-public-key'); if(fake) {
    return fake.innerText;
  }
}

async function loadPrivateKey() {
  log("loading fake private key")
  var fake = el('itsame-fake-private-key'); if(fake) {
    return fake.innerText;
  }
}

// encode an ArrayBuffer (of ints) as a base64 String
function encodeB64(arrayBuffer) {
  var byteArray = new Uint8Array(arrayBuffer)
  var byteString = []
  for (var i=0; i<byteArray.byteLength; i++) {
    byteString.push(String.fromCharCode(byteArray[i]));
  }
  return btoa(byteString.join(''));
}

// decode a base64 String as an ArrayBuffer (of ints)
function decodeB64(b64str) {
  var byteStr = atob(b64str);
  var bytes = new Uint8Array(byteStr.length);
  for (var i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

// remove headers like "-----BEGIN PUBLIC KEY-----" and join lines.
function unfmtKey(pem) {
  var lines = pem.split('\n');
  var encoded = []
  for(var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('--') < 0) {
      encoded.push(lines[i].trim())
    }
  }
  return encoded.join('')
}

function fmtKey(header, key) {
  var lines = [`-----BEGIN ${header} KEY-----`]
  var i = 0; while(i < key.length) {
    lines.push(key.slice(i, i + 64))
    i = i + 64
  }
  lines.push(`-----END ${header} KEY-----`)
  return lines.join('\n')
}

// ---------------------------
// -- ENCRYPTION / DECRYPTION
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

encrypt = async function(plaintext, publicKey) {
  // create a random 96-bit initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // encode the text you want to encrypt
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  // prepare the secret key for encryption
  const key = await pubEncryptKey(publicKey)

  // encrypt the text with the secret key
  const encodedBuffer = await subtle.encrypt({
      name: 'RSA-OAEP',
      label: iv,
  }, key, encodedPlaintext);

  // return the encrypted text "ciphertext" and the IV
  // encoded in base64
  return ({
      ciphertext: encodeB64(encodedBuffer),
      iv: encodeB64(iv),
  })
}

decrypt = async function(ciphertext, iv, privateKey) {
  // prepare the secret key
  const key = await privateEncryptKey(privateKey)
  const cleartext = await subtle.decrypt({
      name: 'RSA-OAEP',
      label: decodeB64(iv),
  }, key, decodeB64(ciphertext))

  // decode the text and return it
  return new TextDecoder().decode(cleartext);
}

// ---------------------------
// -- SIGN / VERIFY
async function importKey_RSA_PSS(key, format, keyUsages) {
  var cleanKey = unfmtKey(key)

  return await crypto.subtle.importKey(
    format,
    decodeB64(cleanKey),
    RSA_PSS,
    false,
    keyUsages);
}

// spki is public only
async function verifyingKey(key) {
  return importKey_RSA_PSS(key, "spki", ["verify"])
}
async function signingKey(key) {
  return importKey_RSA_PSS(key, "pkcs8", ["sign"])
}

sign = async function(text, privateKey) {
  var key; try { key = await signingKey(privateKey)
  } catch(e) {
    console.error('failed to load private key: ' + e, e.stack)
    throw e
  }

  const signatureBuf = await subtle.sign(
    RSA_PSS_PARAMS,
    key,
    new TextEncoder().encode(text))
  return encodeB64(signatureBuf)
}

verify = async function(text, signature, publicKey) {
  const key = await verifyingKey(publicKey)
  return await subtle.verify(
    RSA_PSS_PARAMS,
    key,
    decodeB64(signature),
    new TextEncoder().encode(text))
}

// Recursively find the relevant elements
processFormChild = function(res, n) {
  var cl = n.classList; if(!cl) {} // skip
  else if(cl.contains('itsame-value')) {
    var name = ""; var val = null
    for(at of n.attributes) {
      if(at.nodeName == 'name')  { name = at.nodeValue }
      if(at.nodeName == 'value') { val =  at.nodeValue }
    }
    res.payload.push([name, val])
    return
  }
  else if(cl.contains('itsame-payload'))   {
    res.payNode = n; return;
  }
  else if(cl.contains('itsame-signature')) {
    res.sigNode = n; return;
  }
  for(child of n.childNodes) {
    processFormChild(res, child)
  }
}

processForm = function(form) {
  var res = { payload: [], sigNode: null, payNode: null }
  for(n of form.childNodes) { processFormChild(res, n) }
  res.payload = JSON.stringify(res.payload)
  return res
}

findForms = function() {
  var forms = []
  for(form of document.getElementsByClassName('itsame-form')) {
    var form = processForm(form)
    forms.push(form)
  }
  return forms
}
