load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@io_bazel_rules_go//go:def.bzl", "go_binary")
load("@rules_proto_grpc//grpc-gateway:defs.bzl", "gateway_grpc_library", "gateway_openapiv2_compile")

gateway_grpc_library(
    name = "service_gateway_library",
    importpath = "github.com/dubov94/keyring/grpc_gateway/service_gateway_library",
    deps = ["//proto:service_proto"],
)

gateway_openapiv2_compile(
    name = "swagger_spec",
    visibility = ["//pwa/src/api/definitions:__pkg__"],
    deps = ["//proto:service_proto"],
)

go_binary(
    name = "main",
    srcs = ["main.go"],
    visibility = ["//:root"],
    deps = [
        ":service_gateway_library",
        "@com_github_golang_glog//:go_default_library",
        "@grpc_ecosystem_grpc_gateway//runtime:go_default_library",
        "@org_golang_google_grpc//:go_default_library",
        "@org_golang_google_grpc//metadata:go_default_library",
        "@org_golang_google_protobuf//encoding/protojson:go_default_library",
    ],
)

container_image(
    name = "grpc_gateway",
    base = "@io_docker_index_library_debian//image",
    cmd = [
        "./main",
        "--logtostderr",
        "--server-address=server-service:5001",
    ],
    directory = "/root",
    files = [":main"],
    ports = ["5002"],
    workdir = "/root",
)
