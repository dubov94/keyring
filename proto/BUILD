load("@rules_proto_grpc//go:defs.bzl", "go_grpc_library")
load("@rules_proto_grpc//java:defs.bzl", "java_grpc_library", "java_proto_library")
load("@rules_proto_grpc//js:defs.bzl", "js_proto_compile")

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

proto_library(
    name = "cryptography_proto",
    srcs = ["cryptography.proto"],
)

java_proto_library(
    name = "cryptography_java_proto",
    protos = [":cryptography_proto"],
)

js_proto_compile(
    name = "cryptography_js_proto",
    options = {"//js:js_plugin": ["import_style=commonjs_strict"]},
    protos = [":cryptography_proto"],
)
