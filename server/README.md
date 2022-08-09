# `server`

## Liquibase

```sh
liquibase --changelog-file=server/changelog.postgresql.sql \
    --url=jdbc:postgresql://localhost/keyring --username=postgres --password=postgres \
    generate-changelog --overwrite-output-file=true
```
