java_library(
    name = "user_projection",
    srcs = ["UserProjection.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/interceptors:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = ["//server/src/main/java/com/floreina/keyring/entities:user"],
)

java_library(
    name = "key_value_exception",
    srcs = ["KeyValueException.java"],
)

java_library(
    name = "key_value_module",
    srcs = ["KeyValueModule.java"],
    deps = [
        "//server/src/main/java/com/floreina/keyring:environment",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)

java_library(
    name = "key_value_client",
    srcs = ["KeyValueClient.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/interceptors:__pkg__",
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        ":key_value_exception",
        ":user_projection",
        "//server/src/main/java/com/floreina/keyring:chronometry",
        "//server/src/main/java/com/floreina/keyring:cryptography",
        "@maven//:com_google_code_gson_gson",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)
