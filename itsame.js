
function el(id) { return document.getElementById(id) }
assert = console.assert
log    = console.log

var crypto = window.crypto || window.msCrypto;
var subtle = crypto.subtle
var encryptAlgorithm = {
  name: "RSA-OAEP",
  hash: { name: "SHA-256" }
};

function arrayBufferToBase64String(arrayBuffer) {
  var byteArray = new Uint8Array(arrayBuffer)
  var byteString = '';
  for (var i=0; i<byteArray.byteLength; i++) {
    byteString += String.fromCharCode(byteArray[i]);
  }
  return btoa(byteString);
}

function base64StringToArrayBuffer(b64str) {
  var byteStr = atob(b64str);
  var bytes = new Uint8Array(byteStr.length);
  for (var i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

function textToArrayBuffer(str) {
  var buf = unescape(encodeURIComponent(str)); // 2 bytes for each char
  var bufView = new Uint8Array(buf.length);
  for (var i=0; i < buf.length; i++) {
    bufView[i] = buf.charCodeAt(i);
  }
  return bufView;
}

function convertPemToBinary(pem) {
  var lines = pem.split('\n');
  var encoded = '';
  for(var i = 0;i < lines.length;i++){
    if (lines[i].trim().length > 0 &&
        lines[i].indexOf('-BEGIN RSA PRIVATE KEY-') < 0 && 
        lines[i].indexOf('-BEGIN RSA PUBLIC KEY-') < 0 &&
        lines[i].indexOf('-BEGIN PUBLIC KEY-') < 0 &&
        lines[i].indexOf('-END PUBLIC KEY-') < 0 &&
        lines[i].indexOf('-END RSA PRIVATE KEY-') < 0 &&
        lines[i].indexOf('-END RSA PUBLIC KEY-') < 0) {
      encoded += lines[i].trim();
    }
  }
  return base64StringToArrayBuffer(encoded);
}

function importPublicKey(pemKey) {
  return new Promise(function(resolve) {
    crypto.subtle.importKey(
      "spki",
      convertPemToBinary(pemKey),
      encryptAlgorithm,
      false,
      ["encrypt"]
    ).then(resolve)
  });
}

log("itsame script")

window.onload = function() {
  log("itsame: onload")
  log("subtle: " + subtle)
  var privKey = el("private-key").innerText
  var pubKey  = el("public-key").innerText
  assert(privKey); assert(pubKey)

  var data = "Very important data"
  importPublicKey(pubKey)
    .then(function(key) {
      log("imported key: " + pubKey)
      log("encrypting data: " + data)
      var buf = textToArrayBuffer(data)
      log("encrypting data Buf: " + buf)
      crypto.subtle.encrypt(
        encryptAlgorithm,
        key,
        buf,
      )
      .then(function(cipheredData) {
        log("got cipheredData from crypto: ", cipheredData)
        cipheredValue = arrayBufferToBase64String(cipheredData);
        log("got base64 ciphered: ", cipheredValue)
        return cipheredValue
      })
      .then(function(value) {
        el("encrypted").innerHTML = value
      })
    })

  log("encrypted: " + encrypted)
  log("itsame: onload done")
}
