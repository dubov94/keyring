# keyring

[![Release](https://github.com/dubov94/keyring/actions/workflows/release.yml/badge.svg)](https://github.com/dubov94/keyring/actions/workflows/release.yml)
![Lines of code](https://img.shields.io/tokei/lines/github/dubov94/keyring)<!-- https://github.com/XAMPPRocky/tokei#supported-languages -->

## Instructions

### Development

Install Python (with PIP and `python-is-python3`), Java 11 and
[Bazelisk](https://docs.bazel.build/versions/master/install-bazelisk.html) on a
Linux distribution. You may also need `build-essentials` or an alternative.

Set up [Redis](https://redis.io/), [PostgreSQL](https://www.postgresql.org/) with
`postgres:postgres` as an authentication pair and [Docker](https://www.docker.com/).

Create a database named `keyring` in PostgreSQL; run `bazelisk run //:backends` to
spin up the backends and `bazelisk run //:pwa` to serve the frontend.
