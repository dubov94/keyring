load("//server:aspectj.bzl", "woven_junit5_test")

package(default_testonly = 1)

woven_junit5_test(
    name = "account_operations_client_test",
    srcs = ["AccountOperationsClientTest.java"],
    resources = ["//server/src/main/resources/META-INF:persistence.xml"],
    test_package = "com.floreina.keyring.storage",
    runtime_deps = [
        "@maven//:com_h2database_h2",
        "@maven//:javax_xml_bind_jaxb_api",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:storage_exception",
        "//proto:service_java_grpc",
        "@maven//:com_google_guava_guava",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

woven_junit5_test(
    name = "key_operations_client_test",
    srcs = ["KeyOperationsClientTest.java"],
    resources = ["//server/src/main/resources/META-INF:persistence.xml"],
    test_package = "com.floreina.keyring.storage",
    runtime_deps = [
        "@maven//:com_h2database_h2",
        "@maven//:javax_xml_bind_jaxb_api",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:utilities",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_client",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_client",
        "//proto:service_java_grpc",
        "@maven//:com_google_guava_guava",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)
