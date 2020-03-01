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
        "//server/src/test/java/com/floreina/keyring:__pkg__",
    ],
    deps = ["@maven//:com_google_guava_guava"],
)

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    visibility = ["//server/src/main/java/com/floreina/keyring/keyvalue:__pkg__"],
)
