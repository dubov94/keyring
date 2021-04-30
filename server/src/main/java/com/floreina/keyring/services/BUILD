java_library(
    name = "utilities",
    srcs = ["Utilities.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//proto:service_java_grpc",
    ],
)

java_library(
    name = "administration_service",
    srcs = ["AdministrationService.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":utilities",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:post",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_service_interface",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "//proto:service_java_grpc",
        "@maven//:com_warrenstrange_googleauth",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "authentication_service",
    srcs = ["AuthenticationService.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":utilities",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:post",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_projection",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "//proto:service_java_grpc",
        "@maven//:javax_inject_javax_inject",
    ],
)
