# pearid: id authentication using a public/private keypair

> **WARNING:** This extension is in pre-alpha and uses cryptographic technology
> in a reasonably user-friendly way. However, the author is not a security
> engineer and the software has not (yet) been verified by any security
> engineers.
>
> The "pearid" standard and browser extension comes with no warranty of any kind
> (see LICENSE). It is currently made available mostly so that folks can
> experiment, think and review the concepts in order to create a simple and
> robust authentication scheme in the future.
>
> **DO NOT USE THIS SOFTWARE FOR ANY CRITICAL DATA OR SERVICES**

pearid (Pear Id) is a simple standard for proving your identity with web (or other)
servers. It is designed to be easy to both implement and use. It includes a
browser extension which allows ultra-lightweight identity verification for the
web and beyond. Other libraries will likely be provided and/or linked in the
future.

PearId is part of the [Civboot.org][civboot] tech stack and is designed to meet
the complete identity and verification requirements of Civboot collaborative
software.

![icon](./browser/icon128.png)

_([icon
source](https://publicdomainvectors.org/en/free-clipart/Pear-vector-clip-art/5832.html))_

## Getting Started (Browser Extension)

Install the browser extension. Eventually this will be provided on the
Chrome/Firefox web stores. For now (or if developing) you install with:

* Chrome: url `chrome://extensions` -> click **Load Unpacked** -> load
  `browser/` directory in pearid
* Firefox: not yet tested or supported

Once installed, open the extension settings and click **Generate New Keypair**.
**Warning:** PairId only stores the keys locally and there is no way to recover
a lost private key, so consider storing your private key somewhere private and
secure.

The public key (called your **PearId**) can be shared with the servers/websites
you want to access with your identity. The browser extension will automatically
ask if you want to share your PearId with websites that support it.

Your private key **must be kept secret**. If anyone has access to it they will
be able to impersonate you on whatever servers you've registered with.

* **DON'T** share it with anyone you don't share your bank account with, and
  consider keeping it secret from them too.
* **DO** keep it loaded it into your PearId
  [browser extension](#browser-extension) to sign request payloads
* **DO** load it into applications you trust in order to sign request payloads
* **MAYBE** store it in secure locations you trust.

### Bring Your Own Id

You can also create a public/private key on the command line and copy/paste
them into PearId:
```
# On linux
openssl genrsa -out pear.private 4096
openssl rsa -in pear.private -pubout -out pear.public
```

## Browser Extension
[browser/pearid.js](./browser/pearid.js) contains a browser extension which
automatically signs (injects a signature) into elements containing
`class='pearid-form'`. It requires the user to copy their signature into the
extension.

> Note: the below example is not representative. The page designer will likely
> make some of the elements (i.e. signature, payload and pearid) hidden and/or
> readonly.

For example, a page with:

```html
<!-- Triggers the extension to set the pear id
  (after confirming from user) -->
<textarea rows="1" cols="6" id="pearid">noid</textarea>
<button onclick="
  let e = document.getElementById('pearid')
  e.value = ''; e.dispatchEvent(new Event('change'));
">Get PearId</button>

<!-- Typical pearid form
  The pearid-payload and pearid-signature fields are populated
  by the extension when 'change' events trigger on any
  of the pearid-value elements.
-->
<form id='user-form', class='pearid-form'>
  <input name="user"      value="Alice Bob"   class='pearid-value'></input>
  <input name="birthdate" value="2001-10-31"  class='pearid-value'></input>
  <input name="uuid"      value="a-unique-id" class='pearid-value'></input>
  <p><b>Payload: </b>
  <input class='pearid-payload'></input>
  <p><b>Signature: </b>
  <input class='pearid-signature'></input>
  <input type="button" onclick="pearFormButton('user-form')" value="Submit">
</form>

```

When first loaded, the extension will do nothing because the `id=pearid` element
has `value=noid`. Clicking the `Get PearId` button will clear this field and
cause the PearId extension to fill it with your Pear Id (your public key). The
server can then use this to identify you (look up your "username" that they have
stored) as well as verify the signatures generated.

On page load (and any changes to `pearid-value` elements), the page's
`pearid-payload` value/s will updated and the `pearid-signature` value/s to the
signature of each form's payload signed using your private key.

For example, the values shown above results in the following payload:

```
[["user","Alice Bob"],["birthdate","2001-10-31"],["uuid","a-unique-id"]]
```

When the user hits `submit`, the `submitForm` javascript will see the updated
payload, signature and PearId; which they then send to the server which should
validate the uuid and ACL the PearId (lookup the public key hash for the user
authorizations).

## Webpage / Server Requirements
Designing a webpage to interact with the pearid extension is easy.

### validating keys
See `etc/check_keys.lua` for example `openssh` commands to

1. generate keys
2. create a signature using a private key
3. validate a signature using a public key

If your server uses javascript, you can see `browser/lib.js`
for examples on how to use javascript's SubtleCrypto service.

### uuid

It is server's job to ensure that `uuid` value (which is required in the
`payload`) is a unique identifier for each "session". This prevents a snooper
from repeating a request by simply saving the signature from a request they
read. For example, if they copied a request which set a user as admin, then
they would be able to always re-set that user as admin.

The server must then ensure that the signature is valid **and** the uuid they
receive in the payload is the same as the uuid they gave.

### Login Flow

A server/webpage can create a login flow with only a few html elements and a
tiny amount of javascript+server logic

1. The `id=pearid` (see example) element should be hidden (with some other
   indication that the user is not "logged in") with a default value of
   `"noid"`. If it is any other value, the extension will launch an alert asking
   the user if they want to inject their `pearid`, which you likely don't want
   on every page load.

2. A button should exist called `Get PearId` (see example) which simply clears
   the `id=pearid` element and triggers a `change` event on the `id=pearid`.
   This will trigger the extension to launch an alert and fill the id and
   signatures.

3. You likely want to a `Login` button next to `Get PearId`. This should send
   a request to the server with the user's `PearId` and return a url with their
   id as an attribute (`http://myserver.com?userid=12345`). The user can then
   use this url to "login" to your web-app and view pages with their PearId
   pre-populated as well as other user-specific information (i.e. their
   username).

> Note with the above scheme that it is trivial to impersonate VIEWING as any
> user, since you would only need the url attribute. PairID is only for ensuring
> valid mutations to the server, not for restricting what can be viewed.
> Anything requiring privacy should develop their own standard (although that
> standard COULD possibly use the private PairId key for encryption).

## Development Notes
Testing is done locally by:

* loading the extension from the directory
* running `browser/make.lua` and opening
`file://path/to/browser/play.html` in a browser with the extension loaded.

The html page "unit tests" internal logic and also allows the extension to
perform it's signature injection, as well as see that button presses populate
the javascript world.

A few other testing scripts are in `etc/`

## Releases
Releases:
* creation 2023-01-26, Garrett Berg (vitiral@gmail.com)

## LICENSE
This software is released into the public domain, see LICENSE (aka UNLICENSE).

This software is part of the Civboot.org tech stack. Attribution is appreciated
but not required.

[civboot]: http://civboot.org
