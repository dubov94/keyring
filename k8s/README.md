# Cluster

* [`helm`](https://github.com/helm/helm)
* [`helmfile`](https://github.com/roboll/helmfile)
  * [`helm-diff`](https://github.com/databus23/helm-diff)
* [Storage on DigitalOcean](https://digitalocean.github.io/navigators-guide/book/03-backup/ch07-storage-on-digitalocean.html)

## [Secrets](https://kubernetes.io/docs/tasks/configmap-secret/)

| Secret | Key |
| --- | --- |
| archiver-credentials | service-account-key |
| archiver-links | bucket-name |
| *cluster-tls* | |
| email-service-credentials | mailgun-api-key |
| geoipupdate-credentials | account-id |
| geoipupdate-credentials | license-key |
| *postgres-postgresql-ha-postgresql* | |
| *redis* | |

## Objects

```sh
kubectl apply -f ./k8s/
```

### Helmfile

```sh
helmfile -f ./k8s/helm/helmfile.yaml apply
```

### `restorer_job.yaml`

```sh
KEYRING_OBJECT_NAME=2022-09-01T00:00:00Z envsubst < ./k8s/jobs/restorer_job.yaml | kubectl create -f -
```

## Shell

### PostgreSQL

```sh
kubectl get pods --selector=app.kubernetes.io/component=pgpool
```

```sh
kubectl exec --stdin --tty "$PGPOOL_POD_NAME" -- /bin/bash
```

```sh
PGPASSWORD="$PGPOOL_POSTGRES_PASSWORD" psql --host localhost --user postgres
```

### Redis

```sh
kubectl get pods --selector=app.kubernetes.io/instance=redis
```

#### Sentinel

```sh
kubectl exec --container=sentinel --stdin --tty "$REDIS_POD_NAME" -- /bin/bash
```

Connect to the sentinel CLI.

```sh
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 26379
```

List the parameters of the `default` master.

```
sentinel master default
```

#### Node

```sh
kubectl exec --container=redis --stdin --tty "$REDIS_POD_NAME" -- /bin/bash
```

Connect to the node CLI.

```sh
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 6379
```
