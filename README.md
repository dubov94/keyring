# Key Ring

## Architecture

### Authentication

During the logging in phase user provides `username` and `master_key`. Browser
makes a request to `/authentication/get-salt/{ username }` and receives `salt`
in return. Then `hash` is calculated as `bcrypt(salt, master_key)` (using
[bcryptjs](https://github.com/dcodeIO/bcrypt.js) with the cost of 12), and a
pair of `username` and `hash` gets submitted to the server.

### Encryption

Every single piece of key data is encrypted by `aes(data, sha256(master_key))`
([CryptoJS.SHA256](https://github.com/brix/crypto-js/blob/develop/src/sha256.js)
& [CryptoJS.AES](https://github.com/brix/crypto-js/blob/develop/src/aes.js)).
A configuration including a random initialization vector and the cipher itself
are serialized and stored as a string.

## Development

Set up [Redis](https://redis.io/) and [PostgreSQL](https://www.postgresql.org/)
with `postgres:postgres` as an authentication pair (usually the default).

Run `mvn compile` followed by `mvn exec:exec` from
[`server`](https://github.com/dubov94/keyring/tree/master/server) to launch the
server and `npm run start` from
[`gateway`](https://github.com/dubov94/keyring/tree/master/gateway) to start
proxying from JSON to GRPC.

Execute `npm run develop` from
[`client`](https://github.com/dubov94/keyring/tree/master/client) to spin up the
frontend development server.

## Production

To build the modules locally one may run
`docker build -f {module}/Dockerfile -t dubov94/keyring-{module} .`.

Initialize the cluster by executing `docker swarm init`. Set up all the secrets
using `docker secret create`. Create directories at `/root/postgres` and
`/root/redis`. Finally, deploy the stack (
`docker stack deploy --compose-file=docker-compose.yml keyring`).
