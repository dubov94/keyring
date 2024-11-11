# Application

## Deployment

### Set up secrets

Secrets in italic are populated automatically by Helm charts.

| Secret | Key |
| --- | --- |
| archiver-credentials | service-account-key |
| archiver-links | bucket-name |
| captcha-credentials | turnstile-secret-key |
| *cluster-tls* | |
| email-service-credentials | mailgun-api-key |
| geoipupdate-credentials | account-id |
| geoipupdate-credentials | license-key |
| *postgres-postgresql-ha-pgpool* | |
| *postgres-postgresql-ha-postgresql* | |
| *redis* | |

### Deploy `helmfile.yaml`

```sh
helmfile -f ./k8s/application/helm/helmfile.yaml apply
```

### Deploy regular objects

```sh
kubectl apply -f ./k8s/application/
```

### Restore the database

Choose the latest object name in the GCS bucket, such as `2022-09-01T00:00:00Z`.

```sh
KEYRING_OBJECT_NAME=2022-09-01T00:00:00Z envsubst < ./k8s/application/jobs/restorer_job.yaml | kubectl create -f -
```

## Connections

### PostgreSQL

Get the name of the pgPool pod (`PGPOOL_POD_NAME`).

```sh
kubectl get pods --selector=app.kubernetes.io/component=pgpool
```

Connect to the pod by its name.

```sh
kubectl exec --stdin --tty "$PGPOOL_POD_NAME" -- /bin/bash
```

Run `psql` on pgPool.

```sh
PGPASSWORD="$PGPOOL_POSTGRES_PASSWORD" psql --host localhost --user postgres
```

We are in a Postgres client now. Connect to the database.

```
\c keyring
```

Run queries.

```
select count(*) from users;
```

### Redis

Get the name of the Redis pod (`REDIS_POD_NAME`).

```sh
kubectl get pods --selector=app.kubernetes.io/instance=redis
```

#### Sentinel

Connect to the sentinel container.

```sh
kubectl exec --container=sentinel --stdin --tty "$REDIS_POD_NAME" -- /bin/bash
```

Launch `redis-cli` on the sentinel.

```sh
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 26379
```

List the parameters of the `default` master.

```
sentinel master default
```

#### Node

Connect to the node container.

```sh
kubectl exec --container=redis --stdin --tty "$REDIS_POD_NAME" -- /bin/bash
```

Launch `redis-cli` on the node.

```sh
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 6379
```
