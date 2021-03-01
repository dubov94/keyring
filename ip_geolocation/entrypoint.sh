#!/bin/sh

export GEOIPUPDATE_ACCOUNT_ID="`cat /run/secrets/geoipupdate_account_id`"
export GEOIPUPDATE_LICENSE_KEY="`cat /run/secrets/geoipupdate_license_key`"

./main
