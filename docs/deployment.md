# Deployment

Infrastructurally the service uses (managed) Kubernetes on DigitalOcean and Google Cloud Storage (GCS) for backups. The stack can be roughly divided into:

* `application/`
  * `Ingress`
    * `pwa` (frontend)
    * `redirection`
      * ...from the original domain
    * `grpc_gateway`
      * `/api/` forwarder
  * backends (includes Postgres and Redis)
  * `archiver_cronjob`
    * writes the PG dump to GCS
  * `restorer_cronjob`
    * `pg_restore` essentially
* `monitoring/`
  * `kube-prometheus-stack` (KPS)
  * `loki-stack`
    * connected manually to Grafana from KPS



## Instructions

See [/k8s/README.md](/k8s/README.md) for deployment instructions.

## Alerts

All of them are installed manually at the moment, and Alertmanager hasn't been explored.

### DigitalOcean

`Memory Utilization` is above 90% for 5 min for any of the cluster nodes.

### Mailgun

> 'The primary account holder will receive an e-mail notification when 50% and 75% of the limit has been crossed.'

The message limit has been set to 1k.

### GCS

`received_bytes_count` in the backup bucket is less than KiB for at least 25 hours (the corresponding `CronJob` runs every day).

## Referrals

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg)](https://www.digitalocean.com/?refcode=f0acee128096&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)
