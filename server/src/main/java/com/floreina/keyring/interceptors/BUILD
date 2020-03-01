java_library(
    name = "request_metadata_interceptor_keys",
    srcs = ["RequestMetadataInterceptorKeys.java"],
    deps = [
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
    ],
)

java_library(
    name = "session_interceptor_keys",
    srcs = ["SessionInterceptorKeys.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
    ],
)
