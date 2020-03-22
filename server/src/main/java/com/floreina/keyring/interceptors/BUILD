java_library(
    name = "request_metadata_interceptor_keys",
    srcs = ["RequestMetadataInterceptorKeys.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "request_metadata_interceptor",
    srcs = ["RequestMetadataInterceptor.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":request_metadata_interceptor_keys",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "session_interceptor_keys",
    srcs = ["SessionInterceptorKeys.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/main/java/com/floreina/keyring/aspects:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "session_interceptor",
    srcs = ["SessionInterceptor.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
        "@maven//:javax_inject_javax_inject",
    ],
)
