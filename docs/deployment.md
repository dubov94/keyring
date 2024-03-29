# Deployment

See [/k8s/README.md](/k8s/README.md) for detailed operating instructions.

Infrastructurally the service uses (managed) Kubernetes on DigitalOcean and Google Cloud Storage (GCS) for backups.

## Stack

* `application/`
  * `Ingress`
    * `pwa` (frontend)
    * `redirection`
      * ...from the original domain
    * `grpc_gateway`
      * `/api/` forwarder
  * backends (includes Postgres and Redis)
  * `archiver_cronjob`
    * writes PG dumps to GCS
  * `restorer_cronjob`
    * `pg_restore` essentially
* `monitoring/`
  * `kube-prometheus-stack` (KPS)
  * `loki-stack`
    * connected manually to Grafana from KPS

## Reliability

### Cloudflare

* Caching for the frontends at 1 hour TTL.
* Throttling for the backends (`/api/...`) at 80 QP10S for one IP.

### Alerts

All of them are installed manually at the moment, and Alertmanager hasn't been explored.

* **DigitalOcean**
  * `Memory Utilization` is above 90% for 5 min for any of the cluster nodes.
* **Mailgun**
  * 'The primary account holder will receive an e-mail notification when 50% and 75% of the limit [1k] has been crossed.'
* **Google Cloud Storage**
  * `received_bytes_count` in the backup bucket is less than expected for at least 25 hours (the corresponding `CronJob` runs every day).

### Security

* [debricked.com](https://debricked.com/) for third-party dependencies.
* [snyk.io](https://snyk.io/) for scanning Docker images.

## Referrals

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%201.svg)](https://www.digitalocean.com/?refcode=f0acee128096&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)
