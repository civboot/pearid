# itsame: tell servers it's you with a private key

> **WARNING:** This extension is in pre-alpha and uses cryptographic technology
> in a reasonably user-friendly way. However, the author is not a security
> engineer and the software has not (yet) been verified by any security
> engineers.
>
> The "itsame" standard and browser extension comes with no warranty of any kind
> (see LICENSE). It is currently made available mostly so that folks can
> experiment, think and review the concepts in order to create a simple and
> robust authentication scheme in the future.
>
> **DO NOT USE THIS SOFTWARE FOR ANY CRITICAL DATA OR SERVICES**

itsame ("It's-a-me") is a simple encoding standard for proving your identity.
It is designed to be easy for anyone to implement anywhere (either on a webpage
or an alternative server).

It includes a browser extension which webpages can target to offer
ultra-lightweight identity verification for the web and beyond.

![icon](./browser/icon128.png)

_([icon source](https://publicdomainvectors.org/en/free-clipart/Yin-Yang-lotus/82377.html))_

## Getting Started (Browser Extension)

Create a private/public keypair

```
mkdir -p ~/.secrets/
openssl genrsa -out ~/.secrets/itsame.secret 4096
openssl rsa -in itsame.secret -pubout > ~/.secrets/itsame.public
```

Your `itsame.public` file should be shared with the servers/websites you want to
access with your identity (i.e. by sending the administrator an email, opening
an issue, etc). It is public, it doesn't really matter who has it.

Your `itsame.secret` file should be kept secret. If anyone has access to it
they will be able to impersonate you on whatever servers you've registered with.

* **DON'T** share it with anyone you don't share your bank account with, and
  consider keeping it secret from them too.
* **DO** load it into your itsame browser extension to sign request payloads
* **DO** load it into applications you trust in order to sign request payloads
* **MAYBE** make a physical backup of it on a few USB sticks and put them in a
  safe place... or if you loose the key just generate a new one -- but you'll
  have to re-register with all the servers you registered with.

## Browser Extension
[browser/itsame.js](./browser/itsame.js) contains a browser extension which
automatically signs (injects a signature) elements containing
`class='itsame-form'`. It requires the user to copy their signature into the
extension.

For example, a page with:

```html
<form id='my-form', class='itsame-form'>
  <input name="user"      value="Alice Bob"  class='itsame-value'></input>
  <input name="birthdate" value="2001-10-31" class='itsame-value'></input>
  <span name="uuid" value="a-unique-id" class='itsame-value'></span>
  <p><b>Payload: </b><span requestid="1234" class='itsame-payload'>  <i>no payload yet</i></span></p>
  <p><b>Signature: </b><span class='itsame-signature'><i>no signature yet</i></span></p>
  <input type="button" onclick="submitForm('play-form2')" value="Submit">
</form>
```

Will have the `itsame-payload` element`'s innerText set to:
```
[["user","Alice Bob"],["birthdate","2001-10-31"],["uuid","a-unique-id"]]
```

The signature element will be set to the signature of the payload, signed using
the loaded private key.

When the user hits `submit`, the `submitForm` javascript will see the updated
payload and signature (note: obviously they are also free to construct the
payload themselves), which they then format and send to the server.

It is server's job to ensure that `uuid` (which is required) is a unique
identifier for each "session" (to prevent a snooper from repeating a request).
This is trivial: on every page load increment an id, which you store with
completed requests. Assuming the server has done this, if the signature is valid
(according to the public key) then the payload could only have been created by
someone in possession of the private key.

## Future improvements:

* Security review.
* Allow specifying a private key for specific URL patterns. In paritular,
  prevent the extension from trying to sign every website you visit.
* Allow creation of private keys from within the extension

## Development Notes
Testing is done locally by running `itsame/browser/make.lua` and opening
`file://path/to/itsame/browser/play.html` in a browser with the extension
loaded. This "unit tests" internal logic and also allows the extension to
perform it's signature injection, as well as see that button presses populate
the javascript world.

## Releases
Releases:
* creation 2023-01-26, Garrett Berg (vitiral@gmail.com)

## LICENSE
This software is released into the public domain, see LICENSE (aka UNLICENSE).

This software is part of the Civboot.org tech stack. Attribution is appreciated
but not required.

