// Useful docs:
// * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
//
// The following were highly useful to develop this:
//
// https://medium.com/@tony.infisical/guide-to-web-crypto-api-for-encryption-decryption-1a2c698ebc25
// https://stackoverflow.com/questions/34814480/how-to-load-a-public-key-in-pem-format-for-encryption/34995761#34995761


function el(id) { return document.getElementById(id) }
assert = console.assert
log    = console.log

const crypto = window.crypto || window.msCrypto;
const subtle = crypto.subtle
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

// ---------------------------
// -- ENCRYPTION / DECRYPTION
async function importKey_RSA_OAEP(key, format, keyUsages) {
  log(`?? importKey RSA_OAEP:  [${typeof(key)}] ${key}`)
  var cleanKey = unfmtKey(key)
  log(`?? unfmt: ${cleanKey}`)

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
  log("?? encrypting")
  // create a random 96-bit initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // encode the text you want to encrypt
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  // prepare the secret key for encryption
  const key = await pubEncryptKey(publicKey)
  log("?? got key " + key)

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
  log(`?? importKey RSA_PSS:  [${typeof(key)}] ${key}`)
  var cleanKey = unfmtKey(key)
  log(`?? unfmt: ${cleanKey}`)

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
  log("Signing")
  const key = await signingKey(privateKey)
  const signatureBuf = await subtle.sign(
    RSA_PSS_PARAMS,
    key,
    new TextEncoder().encode(text))
  log("Signed")
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

// ---------------------------
// -- TESTING

async function testing() {

  // some plaintext you want to encrypt
  const text = 'The quick brown fox jumps over the lazy dog';

  // create or bring your own base64-encoded encryption key
  // const key = encodeB64(
  //   crypto.getRandomValues(new Uint8Array(32))
  // )
  const privKey   = el('private-key').innerText
  const publicKey = el('public-key').innerText

  var e = await encrypt(text, publicKey)
  log('encrypted: ' + e)
  el('encrypted').innerHTML = `
  <p>iv=${e.iv}</p>
  <p>${e.ciphertext}</p>`
  var d = await decrypt(e.ciphertext, e.iv, privKey)
  el('decrypted').innerHTML = d
  log('decrypted: ' + d)

  var s = await sign(text, privKey)
  log('signature: ' + e)
  el('signature').innerHTML = s

  var v = await verify(text, s, publicKey)
  log('verified: ' + v)
  el('verified').innerHTML = v + ''
}

if(el("itsame-testing")) {
  window.onload = function() {
    log("itsame: onload")
    log("subtle: " + subtle)
    testing()
    log("itsame: onload done")
  }
}
