#!/bin/sh

./main_package_runner --environment production --redis_host redis \
    --geolocation_address ip-geolocation-service:5003 \
    --mailgun_api_url https://api.eu.mailgun.net/v3 --mailgun_domain mg.parolica.com \
    --email_from_name Parolica --email_from_address noreply@parolica.com
