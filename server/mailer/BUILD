load("@rules_proto_grpc//java:defs.bzl", "java_proto_library")
load("//bazel/java:junit5.bzl", "junit5_test")
load("//bazel/java:packaging.bzl", "java_package")

exports_files(["entrypoint.sh"])

proto_library(
    name = "requests_proto",
    srcs = ["requests.proto"],
)

java_proto_library(
    name = "requests_java_proto",
    protos = [":requests_proto"],
    visibility = ["//server:internal"],
)

java_library(
    name = "broker_keys",
    srcs = ["BrokerKeys.java"],
    visibility = ["//server:internal"],
)

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    deps = ["@maven//:com_beust_jcommander"],
)

java_library(
    name = "consumer_settings",
    srcs = ["ConsumerSettings.java"],
    deps = ["@maven//:org_apache_commons_commons_lang3"],
)

java_library(
    name = "message_consumer",
    srcs = ["MessageConsumer.java"],
    deps = [
        ":broker_keys",
        ":consumer_settings",
        ":environment",
        ":mail_client",
        ":requests_java_proto",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_apache_commons_commons_lang3",
        "@maven//:redis_clients_jedis",
    ],
)

junit5_test(
    name = "message_consumer_test",
    srcs = ["MessageConsumerTest.java"],
    test_package = "keyring.server.mailer",
    runtime_deps = [
        "@maven//:org_slf4j_slf4j_simple",
    ],
    deps = [
        ":environment",
        ":mail_client",
        ":message_consumer",
        "//server/main/messagebroker:message_broker_client",
        "@maven//:com_google_guava_guava",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_testcontainers",
        "@maven//:redis_clients_jedis",
    ],
)

java_library(
    name = "mail_client",
    srcs = ["MailClient.java"],
    deps = [
        ":environment",
        "//server/mailer/templates:mail_vc_body_renderer_factory",
        "//server/mailer/templates:mail_vc_head_renderer_factory",
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
        ":consumer_settings",
        ":environment",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
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
        ":message_consumer",
        "//server/mailer/templates:templates_module",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
    ],
)

java_binary(
    name = "main",
    srcs = ["Mailer.java"],
    main_class = "keyring.server.mailer.Mailer",
    resources = [
        "//server/mailer/java/templates:mail_vc.body.twig",
        "//server/mailer/java/templates:mail_vc.head.twig",
    ],
    visibility = ["//:root"],
    runtime_deps = [
        "@maven//:org_slf4j_slf4j_simple",
    ],
    deps = [
        ":app_component",
        ":environment",
        ":message_consumer",
        "@maven//:com_beust_jcommander",
        "@maven//:com_google_guava_guava",
    ],
)

java_package(
    name = "mailer_package",
    deploy_jar = "main_deploy.jar",
    visibility = ["//server:internal"],
)
