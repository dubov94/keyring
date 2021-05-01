java_library(
    name = "utilities",
    srcs = ["Utilities.java"],
    deps = [
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:user",
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
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:mail_client",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_service_interface",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_pointer",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
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
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:mail_client",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_pointer",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "@maven//:javax_inject_javax_inject",
    ],
)
