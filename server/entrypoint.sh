#!/bin/bash

echo 'Converting secrets into environment variables...'
for path in /run/secrets/*
do
  echo "$path"
  export `basename ${path^^}`="`cat $path`"
done

echo 'Running the server...'
bazel run //server/src/main
