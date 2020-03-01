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
