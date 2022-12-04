load("@rules_proto_grpc//java:defs.bzl", "java_proto_library")
load("//bazel/java:junit5.bzl", "junit5_test")

java_library(
    name = "key_value_exception",
    srcs = ["KeyValueException.java"],
)

java_library(
    name = "key_value_module",
    srcs = ["KeyValueModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = ["//server:internal"],
    deps = [
        "//server/main:environment",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

java_library(
    name = "key_value_client",
    srcs = ["KeyValueClient.java"],
    visibility = ["//server:internal"],
    deps = [
        ":key_value_exception",
        ":values_java_proto",
        "//server/main:chronometry",
        "//server/main/entities:session",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

junit5_test(
    name = "key_value_client_test",
    srcs = ["KeyValueClientTest.java"],
    test_package = "keyring.server.main.keyvalue",
    runtime_deps = [
        "@maven//:org_slf4j_slf4j_simple",
    ],
    deps = [
        ":key_value_client",
        ":key_value_exception",
        ":values_java_proto",
        "//server/main:chronometry",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_testcontainers",
        "@maven//:redis_clients_jedis",
    ],
)

proto_library(
    name = "values_proto",
    srcs = ["values.proto"],
)

java_proto_library(
    name = "values_java_proto",
    visibility = ["//server:internal"],
    protos = [":values_proto"],
)
