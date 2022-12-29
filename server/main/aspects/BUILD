load("//bazel/java:junit5.bzl", "junit5_test")

java_library(
    name = "annotations",
    srcs = ["Annotations.java"],
    visibility = ["//server:internal"],
    deps = ["//server/main/entities:columns_java_proto"],
)

java_library(
    name = "reflection",
    srcs = ["Reflection.java"],
    deps = [
        "@maven//:org_aspectj_aspectjrt",
    ],
)

java_library(
    name = "storage_manager_aspect",
    srcs = ["StorageManagerAspect.java"],
    visibility = ["//server:internal"],
    deps = [
        ":annotations",
        ":reflection",
        "//server/main/storage:storage_exception",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

junit5_test(
    name = "storage_manager_aspect_test",
    srcs = ["StorageManagerAspectTest.java"],
    test_package = "keyring.server.main.aspects",
    deps = [
        ":annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:user",
        "//server/main/storage:storage_exception",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "validate_user_aspect",
    srcs = ["ValidateUserAspect.java"],
    visibility = ["//server:internal"],
    deps = [
        ":annotations",
        "//server/main/entities:user",
        "//server/main/interceptors:session_accessor",
        "//server/main/storage:account_operations_interface",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

junit5_test(
    name = "validate_user_aspect_test",
    srcs = ["ValidateUserAspectTest.java"],
    test_package = "keyring.server.main.aspects",
    deps = [
        "//server/main/aspects:annotations",
        "//server/main/aspects:validate_user_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:user",
        "//server/main/interceptors:session_accessor",
        "//server/main/storage:account_operations_interface",
        "@maven//:io_grpc_grpc_api",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "activated_session_aspect",
    srcs = ["ActivatedSessionAspect.java"],
    visibility = ["//server:internal"],
    deps = [
        ":annotations",
        ":reflection",
        "//server/main/entities:session",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

java_library(
    name = "message_handler",
    srcs = ["MessageHandler.java"],
    visibility = ["//server:internal"],
    deps = ["@maven//:org_aspectj_aspectjtools"],
)
