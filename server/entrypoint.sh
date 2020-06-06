#!/bin/bash

echo 'Converting secrets into environment variables...'
for path in /run/secrets/*
do
  echo "$path"
  export `basename ${path^^}`="`cat $path`"
done

echo 'Running the server...'
./main_package_runner --environment production --redis_host redis --geolocation_address geolocation:5003
