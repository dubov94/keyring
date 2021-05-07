load("//bazel/java:junit5.bzl", "junit5_test")

java_library(
    name = "user_pointer",
    srcs = ["UserPointer.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/interceptors:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/keyvalue:__pkg__",
    ],
    deps = ["//server/src/main/java/com/floreina/keyring/entities:user"],
)

java_library(
    name = "key_value_exception",
    srcs = ["KeyValueException.java"],
    visibility = [
        "//server/src/test/java/com/floreina/keyring/keyvalue:__pkg__",
    ],
)

java_library(
    name = "key_value_module",
    srcs = ["KeyValueModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring:environment",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

java_library(
    name = "key_value_client",
    srcs = ["KeyValueClient.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/interceptors:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":key_value_exception",
        ":user_pointer",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

junit5_test(
    name = "key_value_client_test",
    srcs = ["KeyValueClientTest.java"],
    test_package = "com.floreina.keyring.keyvalue",
    runtime_deps = [
        "@maven//:com_github_kstyrc_embedded_redis",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_client",
        "//server/src/main/java/com/floreina/keyring/keyvalue:key_value_exception",
        "//server/src/main/java/com/floreina/keyring/keyvalue:user_pointer",
        "@maven//:com_github_kstyrc_embedded_redis",
        "@maven//:com_google_code_gson_gson",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
        "@maven//:redis_clients_jedis",
    ],
)
