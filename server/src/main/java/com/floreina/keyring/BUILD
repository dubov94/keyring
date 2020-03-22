java_library(
    name = "chronometry",
    srcs = ["Chronometry.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/test/java/com/floreina/keyring:__pkg__",
    ],
)

java_library(
    name = "cryptography",
    srcs = ["Cryptography.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring:__pkg__",
    ],
    deps = ["@maven//:com_google_guava_guava"],
)

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/geolocation:__pkg__",
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
    ],
)

java_library(
    name = "post",
    srcs = ["Post.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":environment",
        "//server/src/main/java/com/floreina/keyring/templates:code_body_renderer_factory",
        "//server/src/main/java/com/floreina/keyring/templates:code_head_renderer_factory",
        "@maven//:javax_inject_javax_inject",
        "@maven//:net_sargue_mailgun",
    ],
)

java_library(
    name = "entities_expiration",
    srcs = ["EntitiesExpiration.java"],
    visibility = [
        "//server/src/test/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":chronometry",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "top_module",
    srcs = ["TopModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    deps = [
        ":chronometry",
        ":cryptography",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "component",
    srcs = ["Component.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = [
        "//server/src/main:__pkg__",
    ],
    deps = [
        ":entities_expiration",
        ":top_module",
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_module",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_module",
        "//server/src/main/java/com/floreina/keyring/services:administration_service",
        "//server/src/main/java/com/floreina/keyring/services:authentication_service",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:storage_module",
        "//server/src/main/java/com/floreina/keyring/templates:templates_module",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_binary(
    name = "launcher",
    srcs = ["Launcher.java"],
    visibility = [
        "//server/src/main:__pkg__",
    ],
    deps = [
        ":component",
        ":entities_expiration",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
        "@maven//:io_grpc_grpc_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)
