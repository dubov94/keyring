# Development

The project is using
[Bazelisk](https://docs.bazel.build/versions/master/install-bazelisk.html) for
building, running and testing. These instructions will guide you through
starting a local instance on Linux (or
[WSL](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux)).

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

Note that in the development environment activation tokens are not sent by email
&mdash; instead they are printed to the console.

## Testing

* `bazelisk test $(bazelisk query 'tests(//server/...)')`
* `bazelisk test //pwa:unit_tests`

## Liquibase

Database upgrades are managed by
[`changelog.postgresl.sql`](/server/changelog.postgresql.sql). Run
`generate-changelog` from root to regenerate the changelog from scratch from
an existing local instance of the `keyring` database. Note that it's created
by default when `server` is run in the development environment.

```sh
liquibase --changelog-file=server/changelog.postgresql.sql \
    --url=jdbc:postgresql://localhost/keyring \
    --username=postgres --password=postgres \
    generate-changelog --overwrite-output-file=true
```
