load("@rules_proto_grpc//java:defs.bzl", "java_grpc_library")

proto_library(
    name = "keyring_proto",
    srcs = ["keyring.proto"],
)

java_grpc_library(
    name = "keyring_java_grpc",
    visibility = [
        "//server/src/main/java/com/floreina/keyring/entities:__pkg__",
        "//server/src/main/java/com/floreina/keyring/geolocation:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
    ],
    deps = [":keyring_proto"],
)
