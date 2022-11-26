java_library(
    name = "user",
    srcs = [
        "FeaturePrompts.java",
        "User.java",
    ],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":validators",
        "@maven//:com_google_guava_guava",
        "@maven//:commons_io_commons_io",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "key",
    srcs = ["Key.java"],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":user",
        ":validators",
        "//proto:service_java_grpc",
        "@maven//:com_google_guava_guava",
        "@maven//:com_vladmihalcea_hibernate_types_52",
        "@maven//:commons_io_commons_io",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "mail_token",
    srcs = ["MailToken.java"],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":user",
        ":validators",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "session",
    srcs = ["Session.java"],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":user",
        ":validators",
        "@maven//:com_google_guava_guava",
        "@maven//:commons_io_commons_io",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "otp_params",
    srcs = ["OtpParams.java"],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":user",
        "@maven//:com_vladmihalcea_hibernate_types_52",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "otp_token",
    srcs = ["OtpToken.java"],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    deps = [
        ":user",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "entities",
    visibility = ["//server:internal"],
    exports = [
        ":key",
        ":mail_token",
        ":otp_params",
        ":otp_token",
        ":session",
        ":user",
    ],
)

java_binary(
    name = "ddl",
    srcs = ["Ddl.java"],
    main_class = "keyring.server.main.entities.Ddl",
    resources = ["//server/main/entities/java:hibernate.cfg.xml"],
    runtime_deps = ["@maven//:org_slf4j_slf4j_simple"],
    deps = [
        ":entities",
        "@maven//:org_hibernate_hibernate_core",
    ],
)

java_library(
    name = "validators",
    srcs = ["Validators.java"],
    deps = [
        "@maven//:com_google_guava_guava",
    ],
)
