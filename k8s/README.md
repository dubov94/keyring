# Cluster

* [`helm`](https://github.com/helm/helm)
* [`helmfile`](https://github.com/roboll/helmfile)
  * [`helm-diff`](https://github.com/databus23/helm-diff)

## [Secrets](https://kubernetes.io/docs/tasks/configmap-secret/)

| Secret | Key |
| --- | --- |
| *cluster-tls* | |
| email-service-credentials | mailgun-api-key |
| geoipupdate-credentials | account-id |
| geoipupdate-credentials | license-key |
| postgres-credentials | password |
| postgres-credentials | postgres-password |
| postgres-credentials | replication-password |
| redis-credentials | redis-password |

## Volumes

```sh
kubectl apply -f ./k8s/volumes/
```

## Helmfile

```sh
helmfile apply -f ./k8s/helm/helmfile.yaml
```

## Objects

```sh
kubectl apply -f ./k8s/
```
