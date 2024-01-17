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
function loge(error) {
  log(`ERROR ${error}, stack: ${error.stack}`)
}

const crypto = window.crypto || window.msCrypto;
const subtle = crypto.subtle

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
  publicExponent: [0x01, 0x00, 0x01],
  hash: "SHA-256",
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
// -- SIGN / VERIFY
async function importKey_RSA_PSS(key, format, keyUsages) {
  var cleanKey = unfmtKey(key)

  try {
    return await crypto.subtle.importKey(
      format,
      decodeB64(cleanKey),
      RSA_PSS,
      true,
      keyUsages);
  } catch(e) {
    console.error(`${e}: ${e.message} ${e.lineNumber}`)
    throw e
  }
}

// spki is public only
async function importVerifyingKey(key) {
  return importKey_RSA_PSS(key, "spki", ["verify"])
}
async function importSigningKey(key) {
  return importKey_RSA_PSS(key, "pkcs8", ["sign"])
}

async function exportPublicKey(verifyingKey) {
  var exported = await subtle.exportKey("spki", verifyingKey)
  return fmtKey("PUBLIC", encodeB64(exported))
}
async function exportPrivateKey(signingKey) {
  var exported = await subtle.exportKey("pkcs8", signingKey)
  return fmtKey("PRIVATE", encodeB64(exported))
}


sign = async function(text, privateKey) {
  var key; try { key = await importSigningKey(privateKey)
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
  const key = await importVerifyingKey(publicKey)
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
  } else if(cl.contains('itsame-signature')) {
    res.sigNode = n; return;
  } else if(cl.contains('itsame-payload'))   {
    res.payNode = n; return;
  }
  for(child of n.childNodes) {
    processFormChild(res, child)
  }
}

processForm = function(form) {
  var res = {
    payload: [],
    sigNode: null, payNode: null,
  }
  for(n of form.childNodes) { processFormChild(res, n) }
  var hasUuid = false; for(p of res.payload) {
    if(p[0] == 'uuid') { hasUuid = true; break }
  }
  if(!hasUuid) {
    throw new Error('invalid page: missing name="uuid" itsame-value in itsame-form')
  }
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
