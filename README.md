# itsame: ultra simple identity verification scheme

It's-a-me (itsame) is a simple encoding standard for proving your identity.
It is designed to be easy for anyone to implement anywhere (either on the web or
locally). It uses public-private keypairs so that the services you communicate
with know that your communication is you and nobody else.

## Basic Usage

Create a private/public keypair

```
mkdir -p ~/.secrets/
openssl genrsa -out ~/.secrets/itsame.secret 4096
openssl rsa -in itsame.secret -pubout > ~/.secrets/itsame.public
```

Your `itsame.public` file should be shared with the websites you want to access
with your identity. It is public, it doesn't really matter who has it.

Your `itsame.secret` file should be kept secret:

* **DON'T** share it with anyone else
* **DO** load it into your itsame browser extension to sign webpages.
* **DO** use with applications you trust to sign communications with services.
* **MAYBE** make a physical backup of it on a few USB sticks and put them in a
  safe place (if you care about the key)

## Browser Extension
[browser/itsame.js](./browser/itsame.js) contains a browser extension which
automatically signs (injects a signature) into elements containing
`class='itsame-form'`. It requires the user to copy their signature
into the extension.

For example, a page with:

```html
<form id='my-form', class='itsame-form'>
  <input name="user"      value="Alice Bob"  class='itsame-value'></input>
  <input name="birthdate" value="2001-10-31" class='itsame-value'></input>
  <p><b>Payload: </b><span class='itsame-payload'>  <i>no payload yet</i></span></p>
  <p><b>Signature: </b><span class='itsame-signature'><i>no signature yet</i></span></p>
  <input type="button" onclick="submitForm('play-form2')" value="Submit">
</form>
```

Will have the `itsame-payload` element`'s innerText set to:
```
[["user","Alice Bob"],["birthdate","2001-10-31"]]
```

The signature element will be set to the signature of the payload,
signed using the loaded private key.

When the user hits `submit`, the `submitForm` javascript will see the updated
payload and signature (note: obviously they are also free to construct the
payload themselves).


## Development Notes

## Notes

* `content_scripts` can see and modify content. It could be used to
  hash any content in a `form` and store it in a box with class `signature`.

* https://stackoverflow.com/a/30624020/1036670: javascript cryptographic
  signatures, especially `SubtleCrypto.sign()`.

* This was helpful:
https://stackoverflow.com/questions/48521183/web-crypto-api-cannot-import-openssl-keys

* Also this: https://stackoverflow.com/questions/34814480/how-to-load-a-public-key-in-pem-format-for-encryption/34995761#34995761
