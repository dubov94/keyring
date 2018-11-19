#!/bin/sh
while true
do
  date
  curl --location --silent --show-error pwd.floreina.me/api/authentication/get-salt/anonymous
  echo
  sleep 60
done
