java_library(
    name = "user",
    srcs = ["User.java"],
    visibility = ["//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__"],
    deps = [
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
    deps = [
        ":user",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "mail_token",
    srcs = ["MailToken.java"],
    deps = [
        ":user",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "session",
    srcs = ["Session.java"],
    deps = [
        ":user",
        "@maven//:org_hibernate_hibernate_core",
        "@maven//:org_hibernate_javax_persistence_hibernate_jpa_2_1_api",
    ],
)

java_library(
    name = "utilities",
    srcs = ["Utilities.java"],
    deps = [
        ":key",
        ":user",
        "//server/src/main/proto:keyring_java_proto",
    ],
)
