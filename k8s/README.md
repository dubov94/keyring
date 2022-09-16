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

## Helmfile

```sh
helmfile -f ./k8s/helm/helmfile.yaml apply
```

## Objects

```sh
kubectl apply -f ./k8s/
```

### Jobs

```sh
KEYRING_OBJECT_NAME=2022-09-01T00:00:00Z envsubst < ./jobs/restorer_job.yaml | kubectl apply -f -
```
