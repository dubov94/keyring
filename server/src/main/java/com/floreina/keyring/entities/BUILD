java_library(
    name = "user",
    srcs = ["User.java"],
    plugins = [
        "//bazel/java:hibernate_jpamodelgen",
    ],
    visibility = ["//server:sources"],
    deps = [
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "key",
    srcs = [
        "Key.java",
        "Tag.java",
    ],
    plugins = [
        "//bazel/java:hibernate_jpamodelgen",
    ],
    visibility = ["//server:sources"],
    deps = [
        ":user",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "mail_token",
    srcs = ["MailToken.java"],
    plugins = [
        "//bazel/java:hibernate_jpamodelgen",
    ],
    visibility = ["//server:sources"],
    deps = [
        ":user",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "session",
    srcs = ["Session.java"],
    plugins = [
        "//bazel/java:hibernate_jpamodelgen",
    ],
    visibility = ["//server:sources"],
    deps = [
        ":user",
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "utilities",
    srcs = ["Utilities.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
        "//server/src/test/java/com/floreina/keyring/storage:__pkg__",
    ],
    deps = [
        ":key",
        ":user",
        "//server/src/main/proto:keyring_java_grpc",
    ],
)
