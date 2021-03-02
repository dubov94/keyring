# keyring

[![PWA](https://github.com/dubov94/keyring/actions/workflows/pwa.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/pwa.yml)
[![Server](https://github.com/dubov94/keyring/actions/workflows/server.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/server.yml)
[![HTTP-to-GRPC](https://github.com/dubov94/keyring/actions/workflows/grpc_gateway.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/grpc_gateway.yml)
[![Caddy](https://github.com/dubov94/keyring/actions/workflows/reverse_proxy.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/reverse_proxy.yml)
[![GeoIP](https://github.com/dubov94/keyring/actions/workflows/ip_geolocation.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/ip_geolocation.yml)

## Instructions

Install Python (with PIP), Java 11, [Bazel](https://bazel.build) and Docker on
a Linux distribution.

### Development

Set up [Redis](https://redis.io/) and [PostgreSQL](https://www.postgresql.org/)
with `postgres:postgres` as an authentication pair. Create database `keyring`.

Run `bazel run //:all_services` to spin up all components.

### Production

Run `make` to build all images locally.

Initialize a cluster by executing `docker swarm init`. Set up all the secrets
mentioned in `docker-compose.yml` via `docker secret create`. Create
directories at `/root/postgres` and `/root/redis`. Finally, deploy the stack (
`docker stack deploy --compose-file=docker-compose.yml keyring`).
