load("@rules_proto_grpc//java:defs.bzl", "java_grpc_library")

package(default_visibility = ["//server:sources"])

proto_library(
    name = "keyring_proto",
    srcs = ["keyring.proto"],
)

java_grpc_library(
    name = "keyring_java_grpc",
    deps = [":keyring_proto"],
)
