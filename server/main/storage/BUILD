load("//server:aspectj.bzl", "woven_junit5_test")

java_library(
    name = "queries",
    srcs = ["Queries.java"],
    deps = [
        "//server/main/entities:user",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "account_operations_interface",
    srcs = ["AccountOperationsInterface.java"],
    visibility = ["//server:internal"],
    deps = [
        "//proto:service_java_grpc",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:session",
        "//server/main/entities:user",
    ],
)

java_library(
    name = "account_operations_client",
    srcs = ["AccountOperationsClient.java"],
    deps = [
        ":account_operations_interface",
        ":queries",
        "//proto:service_java_grpc",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:key",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "//server/main/entities:utilities",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "account_operations_client_test",
    srcs = ["AccountOperationsClientTest.java"],
    aop_xml = "//server/main/java/META-INF:aop.xml",
    aspects = [
        "//server/main/aspects:validate_user_aspect",
        "//server/main/aspects:storage_manager_aspect",
    ],
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "server.main.storage",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_testcontainers_postgresql",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/main:chronometry",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "//server/main/entities:utilities",
        "//server/main/storage:account_operations_client",
        "//server/main/storage:key_operations_client",
        "//server/main/storage:storage_exception",
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
    visibility = ["//server:internal"],
    deps = [
        "//proto:service_java_grpc",
        "//server/main/entities:key",
    ],
)

java_library(
    name = "key_operations_client",
    srcs = ["KeyOperationsClient.java"],
    deps = [
        ":key_operations_interface",
        ":queries",
        "//proto:service_java_grpc",
        "//server/main/aspects:annotations",
        "//server/main/entities:key",
        "//server/main/entities:user",
        "//server/main/entities:utilities",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "key_operations_client_test",
    srcs = ["KeyOperationsClientTest.java"],
    aop_xml = "//server/main/java/META-INF:aop.xml",
    aspects = [
        "//server/main/aspects:validate_user_aspect",
        "//server/main/aspects:storage_manager_aspect",
    ],
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "server.main.storage",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_testcontainers_postgresql",
    ],
    deps = [
        "//proto:service_java_grpc",
        "//server/main:chronometry",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:utilities",
        "//server/main/storage:account_operations_client",
        "//server/main/storage:key_operations_client",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

java_library(
    name = "storage_exception",
    srcs = ["StorageException.java"],
    visibility = ["//server:internal"],
)

java_library(
    name = "storage_module",
    srcs = ["StorageModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = ["//server:internal"],
    deps = [
        ":account_operations_client",
        ":key_operations_client",
        "//server/main:chronometry",
        "//server/main:environment",
        "//server/main/storage:account_operations_interface",
        "//server/main/storage:key_operations_interface",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
