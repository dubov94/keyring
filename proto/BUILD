load("@io_bazel_rules_go//go:def.bzl", "go_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")
load("@rules_proto_grpc//go:defs.bzl", "go_grpc_library")
load("@rules_proto_grpc//java:defs.bzl", "java_grpc_library")

package(default_visibility = ["//:project"])

proto_library(
    name = "service_proto",
    srcs = ["service.proto"],
    deps = ["@go_googleapis//google/api:annotations_proto"],
)

java_grpc_library(
    name = "service_java_grpc",
    protos = [":service_proto"],
    deps = ["@maven//:com_google_api_grpc_proto_google_common_protos"],
)

proto_library(
    name = "geo_ip_proto",
    srcs = ["geo_ip.proto"],
)

go_grpc_library(
    name = "geo_ip_go_grpc",
    importpath = "github.com/dubov94/keyring/proto/geo_ip_go_grpc",
    protos = [":geo_ip_proto"],
)

java_grpc_library(
    name = "geo_ip_java_grpc",
    protos = [":geo_ip_proto"],
)
