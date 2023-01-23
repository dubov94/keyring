# Kubernetes

See ['Storage on DigitalOcean'](https://digitalocean.github.io/navigators-guide/book/03-backup/ch07-storage-on-digitalocean.html#block-storage-volumes)
for Block Storage Volume guarantees (including encryption-at-rest).

## Prerequisites

Once `kubectl` is configured, install the following.

* [`helm`](https://github.com/helm/helm)
* [`helmfile`](https://github.com/roboll/helmfile)
  * [`helm-diff`](https://github.com/databus23/helm-diff)

## Deployment

See instructions for [the application stack](/k8s/application/README.md) and
[the monitoring stack](/k8s/monitoring/README.md).
