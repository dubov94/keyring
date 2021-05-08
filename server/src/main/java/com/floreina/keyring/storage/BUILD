load("//server:aspectj.bzl", "woven_junit5_test")

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

woven_junit5_test(
    name = "account_operations_client_test",
    srcs = ["AccountOperationsClientTest.java"],
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "com.floreina.keyring.storage",
    runtime_deps = [
        "@maven//:com_h2database_h2",
        "@maven//:javax_xml_bind_jaxb_api",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:storage_exception",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
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

woven_junit5_test(
    name = "key_operations_client_test",
    srcs = ["KeyOperationsClientTest.java"],
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "com.floreina.keyring.storage",
    runtime_deps = [
        "@maven//:com_h2database_h2",
        "@maven//:javax_xml_bind_jaxb_api",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_client",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
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
