# itsame: ultra simple identity verification scheme

It's-a-me (itsame) is a simple encoding standard for proving your identity.
It is designed to be easy for anyone to implement anywhere (either on the web or
locally). It uses public-private keypairs so that the services you communicate
with know that your communication is you and nobody else.

## Basic Usage

Create a private/public keypair

```
openssl genrsa -out itsame.secret 4096
openssl rsa -in itsame.secret -pubout > itsame.public
```

As the name implies, your `itsame.secret` key (file) is secret. It should
stay on your harddisk (possibly in a `~/.secrets/` directory).

* **DON'T** share it with anyone else
* **MAYBE** make a physical backup of it on a few USB sticks and put them in a
  safe place (if you care about the key)
* **DO** load it into your itsame browser extension to sign webpages.
* **DO** use with applications you trust to sign communications with services.


## Development Notes

## Notes

* `content_scripts` can see and modify content. It could be used to
  hash any content in a `form` and store it in a box with class `signature`.

* https://stackoverflow.com/a/30624020/1036670: javascript cryptographic
  signatures, especially `SubtleCrypto.sign()`.

* This was helpful:
https://stackoverflow.com/questions/48521183/web-crypto-api-cannot-import-openssl-keys

* Also this: https://stackoverflow.com/questions/34814480/how-to-load-a-public-key-in-pem-format-for-encryption/34995761#34995761
