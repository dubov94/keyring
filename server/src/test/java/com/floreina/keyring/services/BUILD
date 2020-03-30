load("//bazel/java:junit5.bzl", "junit5_test")
load("//server:aspectj.bzl", "woven_junit5_test")

package(default_testonly = 1)

woven_junit5_test(
    name = "administration_service_test",
    srcs = ["AdministrationServiceTest.java"],
    test_package = "com.floreina.keyring.services",
    deps = [
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:post",
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:mail_token",
        "//server/src/main/java/com/floreina/keyring/entities:session",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_service_interface",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/services:administration_service",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "//proto:service_java_grpc",
        "@maven//:com_google_guava_guava",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

junit5_test(
    name = "authentication_service_test",
    srcs = ["AuthenticationServiceTest.java"],
    test_package = "com.floreina.keyring.services",
    deps = [
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring:post",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/interceptors:request_metadata_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/services:authentication_service",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "//server/src/main/java/com/floreina/keyring/storage:key_operations_interface",
        "//proto:service_java_grpc",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
    ],
)
