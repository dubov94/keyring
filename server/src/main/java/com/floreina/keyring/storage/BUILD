java_library(
    name = "queries",
    srcs = ["Queries.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "account_operations_interface",
    srcs = ["AccountOperationsInterface.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/main/java/com/floreina/keyring/aspects:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/aspects:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
    ],
)

java_library(
    name = "account_operations_client",
    srcs = ["AccountOperationsClient.java"],
    visibility = [
        "//server/src/test/java/com/floreina/keyring/storage:__pkg__",
    ],
    deps = [
        ":account_operations_interface",
        ":queries",
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "key_operations_interface",
    srcs = ["KeyOperationsInterface.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring/entities:key",
    ],
)

java_library(
    name = "key_operations_client",
    srcs = ["KeyOperationsClient.java"],
    visibility = [
        "//server/src/test/java/com/floreina/keyring/storage:__pkg__",
    ],
    deps = [
        ":key_operations_interface",
        ":queries",
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "storage_exception",
    srcs = ["StorageException.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/aspects:__pkg__",
        "//server/src/test/java/com/floreina/keyring/aspects:__pkg__",
        "//server/src/test/java/com/floreina/keyring/storage:__pkg__",
    ],
)

java_library(
    name = "storage_module",
    srcs = ["StorageModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":account_operations_client",
        ":key_operations_client",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring:environment",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
