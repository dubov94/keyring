# KeyRing

## Authentication

During the log in phase user provides `username` and `master_key`. Browser
makes a request to `/authentication/get-salt/{ username }` and receives `salt`
in return. Then `hash` is calculated as `bcrypt(salt, master_key)`, and a pair
of `username` and `hash` gets submitted to the server.

## Encryption

Every single piece of key data is encrypted by `aes(data, sha256(master_key))`.
A random initialization vector and the cipher itself are serialized and stored
as a string.
