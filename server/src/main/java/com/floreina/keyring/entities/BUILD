java_library(
    name = "user",
    srcs = ["User.java"],
    plugins = [
        "//bazel/java:hibernate_jpamodelgen",
    ],
    visibility = ["//server:sources"],
    deps = [
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
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
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
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
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
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
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_hibernate_hibernate_core",
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
        "//proto:service_java_grpc",
    ],
)
