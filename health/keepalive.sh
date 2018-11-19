#!/bin/sh
while true
do
  date
  curl --location --silent --show-errors pwd.floreina.me/api/authentication/get-salt/anonymous
  echo
  sleep 60
done
