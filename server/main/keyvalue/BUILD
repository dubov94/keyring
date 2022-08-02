load("//bazel/java:junit5.bzl", "junit5_test")

java_library(
    name = "user_pointer",
    srcs = ["UserPointer.java"],
    visibility = ["//server:internal"],
    deps = ["//server/main/entities:user"],
)

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
        ":user_pointer",
        "//server/main:chronometry",
        "//server/main:cryptography",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

junit5_test(
    name = "key_value_client_test",
    srcs = ["KeyValueClientTest.java"],
    test_package = "server.main.keyvalue",
    runtime_deps = [
        "@maven//:org_slf4j_slf4j_simple",
    ],
    deps = [
        "//server/main:chronometry",
        "//server/main:cryptography",
        "//server/main/keyvalue:key_value_client",
        "//server/main/keyvalue:key_value_exception",
        "//server/main/keyvalue:user_pointer",
        "@maven//:com_google_code_gson_gson",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_testcontainers",
        "@maven//:redis_clients_jedis",
    ],
)
