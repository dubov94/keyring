java_library(
    name = "chronometry",
    srcs = ["Chronometry.java"],
    visibility = ["//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__"],
)

java_library(
    name = "cryptography",
    srcs = ["Cryptography.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring:__pkg__",
    ],
    deps = ["@maven//:com_google_guava_guava"],
)

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/geolocation:__pkg__",
        "//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__",
        "//server/src/main/java/com/floreina/keyring/storage:__pkg__",
    ],
)

java_library(
    name = "post",
    srcs = ["Post.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":environment",
        "//server/src/main/java/com/floreina/keyring/templates:code_body_renderer_factory",
        "//server/src/main/java/com/floreina/keyring/templates:code_head_renderer_factory",
        "@maven//:javax_inject_javax_inject",
        "@maven//:net_sargue_mailgun",
    ],
)
