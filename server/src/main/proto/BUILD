proto_library(
    name = "keyring_proto",
    srcs = ["keyring.proto"],
)

java_proto_library(
    name = "keyring_java_proto",
    visibility = ["//server/src/main/java/com/floreina/keyring/entities:__pkg__"],
    deps = [":keyring_proto"],
)
