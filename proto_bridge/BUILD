load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@io_bazel_rules_go//go:def.bzl", "go_binary")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
load("@rules_proto_grpc//github.com/grpc-ecosystem/grpc-gateway:defs.bzl", "gateway_grpc_library")

gateway_grpc_library(
    name = "keyring_gateway_library",
    importpath = "github.com/dubov94/keyring/proto-bridge/keyring_gateway_library",
    deps = ["//server/src/main/proto:keyring_proto"],
)

go_binary(
    name = "main",
    srcs = ["main.go"],
    deps = [
        ":keyring_gateway_library",
        "@com_github_golang_glog//:go_default_library",
        "@grpc_ecosystem_grpc_gateway//runtime:go_default_library",
        "@org_golang_google_grpc//:go_default_library",
    ],
)

container_image(
    name = "proto_bridge",
    base = "@io_docker_index_library_debian//image",
    cmd = [
        "./main",
        "--server-address=server:591",
    ],
    directory = "/root",
    files = [":main"],
    ports = ["80"],
    workdir = "/root",
)
