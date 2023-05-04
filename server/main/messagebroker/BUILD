java_library(
    name = "message_broker_client",
    srcs = ["MessageBrokerClient.java"],
    visibility = ["//server:internal"],
    deps = [
        "//server/mailer:broker_keys",
        "//server/mailer:requests_java_proto",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:redis_clients_jedis",
    ],
)
