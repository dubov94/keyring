load("//server:aspectj.bzl", "woven_junit5_test")
load("//server/main:aspectj.bzl", "ASPECTS")

java_library(
    name = "queries",
    srcs = ["Queries.java"],
    deps = ["@maven//:javax_persistence_javax_persistence_api"],
)

java_library(
    name = "limiters",
    srcs = ["Limiters.java"],
    deps = [
        ":queries",
        "//server/main:chronometry",
        "//server/main/entities:key",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:session",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "account_operations_interface",
    srcs = ["AccountOperationsInterface.java"],
    visibility = ["//server:internal"],
    deps = [
        "//proto:service_java_grpc",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:otp_token",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:io_vavr_vavr",
    ],
)

java_library(
    name = "account_operations_client",
    srcs = ["AccountOperationsClient.java"],
    deps = [
        ":account_operations_interface",
        ":limiters",
        ":queries",
        "//proto:service_java_grpc",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:key",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:otp_token",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:io_vavr_vavr",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "account_operations_client_test",
    srcs = ["AccountOperationsClientTest.java"],
    aop_xml = "//server/main/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.main.storage",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":account_operations_client",
        ":account_operations_interface",
        ":limiters",
        "//proto:service_java_grpc",
        "//server/main:arithmetic",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:key",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:otp_token",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "//server/main/storage:key_operations_client",
        "//server/main/storage:storage_exception",
        "@maven//:com_google_guava_guava",
        "@maven//:io_vavr_vavr",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
    ],
)

java_library(
    name = "key_operations_interface",
    srcs = ["KeyOperationsInterface.java"],
    visibility = ["//server:internal"],
    deps = [
        "//proto:service_java_grpc",
        "//server/main/entities:key",
        "@maven//:io_vavr_vavr",
    ],
)

java_library(
    name = "key_operations_client",
    srcs = ["KeyOperationsClient.java"],
    deps = [
        ":key_operations_interface",
        ":limiters",
        ":queries",
        "//proto:service_java_grpc",
        "//server/main/aspects:annotations",
        "//server/main/entities:key",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:io_vavr_vavr",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "key_operations_client_test",
    srcs = ["KeyOperationsClientTest.java"],
    aop_xml = "//server/main/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.main.storage",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":limiters",
        "//proto:service_java_grpc",
        "//server/main:arithmetic",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:key",
        "//server/main/entities:user",
        "//server/main/storage:account_operations_client",
        "//server/main/storage:key_operations_client",
        "//server/main/storage:storage_exception",
        "@maven//:com_google_guava_guava",
        "@maven//:io_vavr_vavr",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
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
        ":limiters",
        "//server/main:chronometry",
        "//server/main:environment",
        "//server/main/entities:key",
        "//server/main/entities:mail_token",
        "//server/main/entities:otp_params",
        "//server/main/entities:session",
        "//server/main/storage:account_operations_interface",
        "//server/main/storage:key_operations_interface",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
