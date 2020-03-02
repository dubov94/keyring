java_library(
    name = "geolocation_service_interface",
    srcs = ["GeolocationServiceInterface.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = ["//server/src/main/proto:keyring_java_grpc"],
)

java_library(
    name = "geolocation_service_client",
    srcs = ["GeolocationServiceClient.java"],
    deps = [
        ":geolocation_service_interface",
        "//server/src/main/proto:keyring_java_grpc",
        "@maven//:com_google_http_client_google_http_client",
    ],
)

java_library(
    name = "geolocation_module",
    srcs = ["GeolocationModule.java"],
    deps = [
        ":geolocation_service_client",
        ":geolocation_service_interface",
        "//server/src/main/java/com/floreina/keyring:environment",
        "//server/src/main/proto:keyring_java_grpc",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_http_client_google_http_client",
        "@maven//:com_google_http_client_google_http_client_gson",
        "@maven//:javax_inject_javax_inject",
    ],
)
