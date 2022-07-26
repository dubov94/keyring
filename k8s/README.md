# Cluster

## Secrets

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
