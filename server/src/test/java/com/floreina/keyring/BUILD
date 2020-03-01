load("//:junit5.bzl", "junit5_test")

package(default_testonly = 1)

junit5_test(
    name = "cryptography_test",
    srcs = ["CryptographyTest.java"],
    test_package = "com.floreina.keyring",
    deps = [
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
    ],
)
