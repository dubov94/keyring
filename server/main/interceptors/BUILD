java_library(
    name = "request_metadata_interceptor_keys",
    srcs = ["RequestMetadataInterceptorKeys.java"],
    visibility = ["//server:internal"],
    deps = [
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "request_metadata_interceptor",
    srcs = ["RequestMetadataInterceptor.java"],
    visibility = ["//server:internal"],
    deps = [
        ":request_metadata_interceptor_keys",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "session_interceptor_keys",
    srcs = ["SessionInterceptorKeys.java"],
    visibility = ["//server:internal"],
    deps = [
        "//server/main/keyvalue:user_pointer",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "session_interceptor",
    srcs = ["SessionInterceptor.java"],
    visibility = ["//server:internal"],
    deps = [
        ":session_interceptor_keys",
        "//server/main/keyvalue:key_value_client",
        "//server/main/keyvalue:user_pointer",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "version_interceptor_keys",
    srcs = ["VersionInterceptorKeys.java"],
    deps = [
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "version_interceptor",
    srcs = ["VersionInterceptor.java"],
    visibility = ["//server:internal"],
    deps = [
        ":version_interceptor_keys",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)
