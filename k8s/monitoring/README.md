# Monitoring

## Deployment

```sh
helmfile -f ./k8s/monitoring/helmfile.yaml apply
```

## Connections

### Grafana

```sh
kubectl --namespace monitoring port-forward svc/kube-prometheus-stack-grafana 3000:http-web
```

The credentials can be found under the `kube-prometheus-stack-grafana` secret.
