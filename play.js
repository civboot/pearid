
import {encrypt, decrypt, sign, verify} from './itsame.js';

async function play() {

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

window.onload = function() {
  log("itsame: onload")
  log("subtle: " + subtle)
  play()
  log("itsame: onload done")
}
