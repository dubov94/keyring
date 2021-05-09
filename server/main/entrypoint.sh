#!/bin/sh

export MAILGUN_API_KEY="`cat /run/secrets/mailgun_api_key`"

./main_package_runner --environment production --redis_host redis --geolocation_address ip-geolocation:5003
