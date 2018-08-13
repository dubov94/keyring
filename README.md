# Key Ring

## Authentication

During the logging in phase user provides `username` and `master_key`. Browser
makes a request to `/authentication/get-salt/{ username }` and receives `salt`
in return. Then `hash` is calculated as `bcrypt(salt, master_key)` (using
[bcryptjs](https://github.com/dcodeIO/bcrypt.js) with the cost of 12), and a
pair of `username` and `hash` gets submitted to the server.

## Encryption

Every single piece of key data is encrypted by `aes(data, sha256(master_key))`
([CryptoJS.SHA256](https://github.com/brix/crypto-js/blob/develop/src/sha256.js)
 & [CryptoJS.AES](https://github.com/brix/crypto-js/blob/develop/src/aes.js)).
A configuration including a random initialization vector and the cipher itself
are serialized and stored as a string.
