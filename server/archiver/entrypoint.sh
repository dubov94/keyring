#!/bin/sh

./main --logtostderr \
    --host=postgres-postgresql-ha-pgpool --database-name=keyring \
    --json-creds-path="$CLOUD_CREDS_PATH" --bucket-name="$BUCKET_NAME"
