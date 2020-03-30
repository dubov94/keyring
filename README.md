# Key Ring

## Development

Set up [Redis](https://redis.io/) and [PostgreSQL](https://www.postgresql.org/)
with `postgres:postgres` as an authentication pair (usually the default).

Run `bazel //server/src/main` to launch the server and `bazel //grpc_gateway:main` to
start proxying from JSON to GRPC.

Execute `npm run develop` from
[`client`](https://github.com/dubov94/keyring/tree/master/client) to spin up the
frontend development server.

## Production

To build all of the modules locally one may run `make`.

Initialize the cluster by executing `docker swarm init`. Set up all the secrets
using `docker secret create`. Create directories at `/root/postgres` and
`/root/redis`. Finally, deploy the stack (
`docker stack deploy --compose-file=docker-compose.yml keyring`).
