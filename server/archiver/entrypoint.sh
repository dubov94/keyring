#!/bin/sh

./main --logtostderr --pg-dbname-path="$PG_DBNAME_PATH" \
    --json-creds-path="$CLOUD_CREDS_PATH" --bucket-name="$BUCKET_NAME"
