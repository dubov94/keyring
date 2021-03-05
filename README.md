# keyring

[![Release](https://github.com/dubov94/keyring/actions/workflows/release.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/release.yml)
![Lines of code](https://img.shields.io/tokei/lines/github/dubov94/keyring)

## Instructions

### Development

Install Python (with PIP), Java 11 and [Bazel](https://bazel.build) on a Linux
distribution.

Set up [Redis](https://redis.io/) and [PostgreSQL](https://www.postgresql.org/)
with `postgres:postgres` as an authentication pair. Create database `keyring`.

Run `bazel run //:backends` to spin up backends and `bazel run //pwa:serve` to
serve frontend.

### Production

Initialize a cluster by executing `docker swarm init`. Set up all the secrets
mentioned in `docker-compose.yml` via `docker secret create`. Create volume
directories at `/root/postgres`, `/root/redis` and `/root/geo_ip`. Finally,
deploy the stack (`docker stack deploy --compose-file=docker-compose.yml keyring`).
