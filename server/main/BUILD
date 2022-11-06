load("//bazel/java:junit5.bzl", "junit5_test")
load("//server:aspectj.bzl", "woven_java_binary")

exports_files([
    "entrypoint.sh",
])

java_library(
    name = "arithmetic",
    srcs = ["Arithmetic.java"],
    visibility = ["//server:internal"],
)

java_library(
    name = "chronometry",
    srcs = ["Chronometry.java"],
    visibility = ["//server:internal"],
    deps = [":arithmetic"],
)

java_library(
    name = "cryptography",
    srcs = ["Cryptography.java"],
    visibility = ["//server:internal"],
    deps = [
        ":arithmetic",
        "@maven//:com_google_guava_guava",
    ],
)

junit5_test(
    name = "cryptography_test",
    srcs = ["CryptographyTest.java"],
    test_package = "server.main",
    deps = [
        ":arithmetic",
        "//server/main:cryptography",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    visibility = ["//server:internal"],
    deps = ["@maven//:com_beust_jcommander"],
)

java_library(
    name = "mail_client",
    srcs = ["MailClient.java"],
    visibility = ["//server:internal"],
    deps = [
        ":environment",
        "//server/main/templates:mail_verification_code_body_renderer_factory",
        "//server/main/templates:mail_verification_code_head_renderer_factory",
        "@maven//:javax_inject_javax_inject",
        "@maven//:net_sargue_mailgun",
    ],
)

java_library(
    name = "app_module",
    srcs = ["AppModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    deps = [
        ":arithmetic",
        ":chronometry",
        ":cryptography",
        ":environment",
        "//server/main/interceptors:agent_accessor",
        "//server/main/interceptors:agent_interceptor",
        "//server/main/interceptors:session_accessor",
        "//server/main/interceptors:version_accessor",
        "//server/main/interceptors:version_interceptor",
        "//server/turnstile",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_warrenstrange_googleauth",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_library(
    name = "app_component",
    srcs = ["AppComponent.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    deps = [
        ":app_module",
        ":environment",
        "//server/main/geolocation:geolocation_module",
        "//server/main/interceptors:agent_interceptor",
        "//server/main/interceptors:session_accessor",
        "//server/main/interceptors:session_interceptor",
        "//server/main/interceptors:version_interceptor",
        "//server/main/keyvalue:key_value_module",
        "//server/main/services:administration_service",
        "//server/main/services:authentication_service",
        "//server/main/storage:account_operations_interface",
        "//server/main/storage:storage_module",
        "//server/main/templates:templates_module",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_binary(
    name = "launcher",
    srcs = ["Launcher.java"],
    main_class = "server.main.Launcher",
    deps = [
        ":app_component",
        ":environment",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/aspects:validate_user_aspect",
        "@maven//:com_beust_jcommander",
        "@maven//:io_grpc_grpc_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

woven_java_binary(
    name = "main",
    aop_xml = "//server/main/java/META-INF:aop.xml",
    aspects = [
        "//server/main/aspects:validate_user_aspect",
        "//server/main/aspects:storage_manager_aspect",
    ],
    jvm_flags = [
        # https://github.com/pgjdbc/pgjdbc/issues/986
        "--add-opens java.base/java.util=ALL-UNNAMED",
    ],
    main_class = "keyring.server.main.Launcher",
    resources = [
        "//server/java/META-INF:persistence.xml",
        "//server/main/java/templates:mail_verification_code.body.twig",
        "//server/main/java/templates:mail_verification_code.head.twig",
    ],
    visibility = [
        "//:root",
        "//server:internal",
    ],
    runtime_deps = [
        ":app_component",
        ":launcher",
        "@maven//:io_grpc_grpc_netty_shaded",
        "@maven//:io_grpc_grpc_protobuf",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:javax_activation_activation",
        "@maven//:javax_xml_bind_jaxb_api",
        "@maven//:org_hibernate_hibernate_c3p0",
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_slf4j_slf4j_simple",
    ],
)
