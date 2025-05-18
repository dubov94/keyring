load("@rules_proto_grpc//java:defs.bzl", "java_proto_library")

java_library(
    name = "user",
    srcs = [
        "FeaturePrompts.java",
        "User.java",
    ],
    plugins = ["//bazel/java:hibernate_jpamodelgen"],
    visibility = ["//server:internal"],
    runtime_deps = [
        # For `hibernate-types-52`.
        "@maven//:com_fasterxml_jackson_core_jackson_databind",
    ],
    deps = [
        ":columns_java_proto",
        ":user_state_converter",
        ":validators",
        "@maven//:com_google_guava_guava",
        "@maven//:com_vladmihalcea_hibernate_types_52",
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
    runtime_deps = [
        # For `hibernate-types-52`.
        "@maven//:com_fasterxml_jackson_core_jackson_databind",
    ],
    deps = [
        ":user",
        ":validators",
        "//proto:service_java_grpc",
        "@maven//:com_google_guava_guava",
        "@maven//:com_vladmihalcea_hibernate_types_52",
        "@maven//:commons_io_commons_io",
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
        ":columns_java_proto",
        ":mail_token_state_converter",
        ":user",
        ":validators",
        "//server/main:chronometry",
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
        ":columns_java_proto",
        ":session_stage_converter",
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
    runtime_deps = [
        # For `hibernate-types-52`.
        "@maven//:com_fasterxml_jackson_core_jackson_databind",
    ],
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
        ":mail_token_state_converter",
        ":otp_params",
        ":otp_token",
        ":session",
        ":session_stage_converter",
        ":user",
        ":user_state_converter",
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

proto_library(
    name = "columns_proto",
    srcs = ["columns.proto"],
)

java_proto_library(
    name = "columns_java_proto",
    protos = [":columns_proto"],
    visibility = ["//server:internal"],
)

java_library(
    name = "user_state_converter",
    srcs = ["UserStateConverter.java"],
    deps = [
        ":columns_java_proto",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "session_stage_converter",
    srcs = ["SessionStageConverter.java"],
    deps = [
        ":columns_java_proto",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "mail_token_state_converter",
    srcs = ["MailTokenStateConverter.java"],
    deps = [
        ":columns_java_proto",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
