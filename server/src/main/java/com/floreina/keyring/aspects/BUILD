load("//bazel/java:junit5.bzl", "junit5_test")

java_library(
    name = "annotations",
    srcs = ["Annotations.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
        "//server/src/test/java/com/floreina/keyring/aspects:__pkg__",
    ],
    deps = ["//server/src/main/java/com/floreina/keyring/entities:user"],
)

java_library(
    name = "storage_manager_aspect",
    srcs = ["StorageManagerAspect.java"],
    visibility = ["//server:sources"],
    deps = [
        ":annotations",
        "//server/src/main/java/com/floreina/keyring/storage:storage_exception",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

junit5_test(
    name = "storage_manager_aspect_test",
    srcs = ["StorageManagerAspectTest.java"],
    test_package = "com.floreina.keyring.aspects",
    deps = [
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/storage:storage_exception",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "validate_user_aspect",
    srcs = ["ValidateUserAspect.java"],
    visibility = ["//server:sources"],
    deps = [
        ":annotations",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

junit5_test(
    name = "validate_user_aspect_test",
    srcs = ["ValidateUserAspectTest.java"],
    test_package = "com.floreina.keyring.aspects",
    deps = [
        "//server/src/main/java/com/floreina/keyring/aspects:annotations",
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "//server/src/main/java/com/floreina/keyring/interceptors:session_interceptor_keys",
        "//server/src/main/java/com/floreina/keyring/storage:account_operations_interface",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)
