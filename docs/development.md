# Development

The project is using [Bazelisk](https://docs.bazel.build/versions/master/install-bazelisk.html) for building, running and testing. These instructions will guide you through starting a local instance on Linux (or [WSL](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux)).

## Prerequisites

### Packages

* <i>`build-essential` or an alternative</i>
* Python (with PIP and `python-is-python3`)
* Java 11

### Services

* [Redis](https://redis.io/)
* [PostgreSQL](https://www.postgresql.org/)
  * <i>`postgres:postgres` as credentials</i>
  * Create an empty database named `keyring`
* [Docker](https://www.docker.com/) (for `Testcontainers`)

## Running

* `bazelisk run //:backends` to start the backends
* `bazelisk run //:pwa` to start the frontend

Note that in the development environment activation tokens are not sent by email &mdash; instead they are printed to the console.
