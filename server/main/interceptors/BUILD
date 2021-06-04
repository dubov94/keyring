java_library(
    name = "agent_accessor",
    srcs = ["AgentAccessor.java"],
    visibility = ["//server:internal"],
    deps = [
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "agent_interceptor",
    srcs = ["AgentInterceptor.java"],
    visibility = ["//server:internal"],
    deps = [
        ":agent_accessor",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)

java_library(
    name = "session_accessor",
    srcs = ["SessionAccessor.java"],
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
        ":session_accessor",
        "//server/main/keyvalue:key_value_client",
        "//server/main/keyvalue:user_pointer",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "version_accessor",
    srcs = ["VersionAccessor.java"],
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
        ":version_accessor",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_context",
    ],
)
