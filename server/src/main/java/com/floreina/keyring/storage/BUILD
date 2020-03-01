java_library(
    name = "queries",
    srcs = ["Queries.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "account_operations_interface",
    srcs = ["AccountOperationsInterface.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/proto:keyring_java_proto",
    ],
)

java_library(
    name = "account_operations_client",
    srcs = ["AccountOperationsClient.java"],
    deps = [
        ":account_operations_interface",
        ":queries",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/proto:keyring_java_proto",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "key_operations_interface",
    srcs = ["KeyOperationsInterface.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/proto:keyring_java_proto",
    ],
)

java_library(
    name = "key_operations_client",
    srcs = ["KeyOperationsClient.java"],
    deps = [
        ":key_operations_interface",
        ":queries",
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/proto:keyring_java_proto",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "storage_exception",
    srcs = ["StorageException.java"],
)

java_library(
    name = "storage_module",
    srcs = ["StorageModule.java"],
    deps = [
        ":account_operations_client",
        ":key_operations_client",
        "//server/src/main/java/com/floreina/keyring:environment",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)
