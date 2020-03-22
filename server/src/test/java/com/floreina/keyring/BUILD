load("//bazel/java:junit5.bzl", "junit5_test")

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

junit5_test(
    name = "entities_expiration_test",
    srcs = ["EntitiesExpirationTest.java"],
    data = [
        "//bazel/java:aspectjweaver",
    ],
    jvm_flags = [
        "-javaagent:$(rootpath //bazel/java:aspectjweaver)",
        # https://www.eclipse.org/aspectj/doc/released/README-194.html
        "--add-opens java.base/java.lang=ALL-UNNAMED",
    ],
    resources = [
        "//server/src/main/resources/META-INF:aop.xml",
        "//server/src/main/resources/META-INF:persistence.xml",
    ],
    test_package = "com.floreina.keyring",
    runtime_deps = [
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
        "@maven//:com_h2database_h2",
        "@maven//:javax_xml_bind_jaxb_api",
    ],
    deps = [
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring:entities_expiration",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/entities:key",
        "//server/src/main/java/com/floreina/keyring/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
        "@maven//:org_mockito_mockito_core",
    ],
)
