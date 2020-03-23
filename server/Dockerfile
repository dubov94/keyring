from l.gcr.io/google/bazel:2.2.0

workdir /root/keyring

copy ./WORKSPACE ./
copy ./.bazelrc ./
copy ./bazel ./bazel
copy ./server ./server

run bazel build //server/src/main

env MODULE_ENVIRONMENT="production"
expose 591
cmd ["./entrypoint.sh"]
