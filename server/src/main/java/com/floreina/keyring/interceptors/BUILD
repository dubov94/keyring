java_library(
    name = "request_metadata_interceptor_keys",
    srcs = ["RequestMetadataInterceptorKeys.java"],
    deps = [
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
    ],
)

java_library(
    name = "request_metadata_interceptor",
    srcs = ["RequestMetadataInterceptor.java"],
    deps = [
        ":request_metadata_interceptor_keys",
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
    ],
)

java_library(
    name = "session_interceptor_keys",
    srcs = ["SessionInterceptorKeys.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
    ],
)

java_library(
    name = "session_interceptor",
    srcs = ["SessionInterceptor.java"],
    deps = [
        ":session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "@maven//:io_grpc_grpc_context",
        "@maven//:io_grpc_grpc_core",
        "@maven//:javax_inject_javax_inject",
    ],
)
