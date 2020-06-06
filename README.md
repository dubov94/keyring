# Key Ring

Install Java 11, [Bazel](https://bazel.build) and Docker.

## Development

Set up [Redis](https://redis.io/) and [PostgreSQL](https://www.postgresql.org/)
with `postgres:postgres` as an authentication pair. Create database `keyring`.

Run `bazel run //:all_services` to spin up all components.

## Production

To build all of the modules locally one may run `make`.

Initialize the cluster by executing `docker swarm init`. Set up all the secrets
using `docker secret create`. Create directories at `/root/postgres` and
`/root/redis`. Finally, deploy the stack (
`docker stack deploy --compose-file=docker-compose.yml keyring`).
