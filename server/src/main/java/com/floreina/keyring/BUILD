java_library(
    name = "chronometry",
    srcs = ["Chronometry.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
        "//server/src/test/java/com/floreina/keyring:__pkg__",
        "//server/src/test/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/test/java/com/floreina/keyring/storage:__pkg__",
    ],
)

java_library(
    name = "cryptography",
    srcs = ["Cryptography.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring:__pkg__",
        "//server/src/test/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
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
    deps = ["@maven//:com_beust_jcommander"],
)

java_library(
    name = "post",
    srcs = ["Post.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
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
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "app_module",
    srcs = ["AppModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    deps = [
        ":chronometry",
        ":cryptography",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/interceptors:version_interceptor",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_warrenstrange_googleauth",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "app_component",
    srcs = ["AppComponent.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = [
        "//server/src/main:__pkg__",
    ],
    deps = [
        ":app_module",
        ":entities_expiration",
        ":environment",
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_module",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/interceptors:version_interceptor",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_module",
        "//server/src/main/java/com/floreina/keyring/services:administration_service",
        "//server/src/main/java/com/floreina/keyring/services:authentication_service",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:storage_module",
        "//server/src/main/java/com/floreina/keyring/templates:templates_module",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_binary(
    name = "launcher",
    srcs = ["Launcher.java"],
    visibility = [
        "//server/src/main:__pkg__",
    ],
    deps = [
        "environment",
        ":app_component",
        ":entities_expiration",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
        "@maven//:com_beust_jcommander",
        "@maven//:io_grpc_grpc_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)
