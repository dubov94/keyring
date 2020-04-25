load("@io_bazel_rules_go//go:def.bzl", "go_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")
load("@rules_proto_grpc//java:defs.bzl", "java_grpc_library")

package(default_visibility = [
    "//grpc_gateway:__pkg__",
    "//server:sources",
])

proto_library(
    name = "service_proto",
    srcs = ["service.proto"],
    deps = ["@go_googleapis//google/api:annotations_proto"],
)

java_grpc_library(
    name = "service_java_grpc",
    deps = [":service_proto"],
)