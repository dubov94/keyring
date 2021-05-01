load("//bazel/java:junit5.bzl", "junit5_test")

package(default_testonly = 1)

junit5_test(
    name = "key_value_client",
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
