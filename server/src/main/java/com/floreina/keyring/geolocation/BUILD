java_library(
    name = "geolocation_service_interface",
    srcs = ["GeolocationServiceInterface.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring/services:__pkg__",
        "//server/src/test/java/com/floreina/keyring/services:__pkg__",
    ],
    deps = [
        "//proto:geo_ip_java_grpc",
        "//proto:service_java_grpc",
    ],
)

java_library(
    name = "geolocation_service_client",
    srcs = ["GeolocationServiceClient.java"],
    visibility = [
        "//server/src/test/java/com/floreina/keyring/geolocation:__pkg__",
    ],
    deps = [
        ":geolocation_service_interface",
        "//proto:geo_ip_java_grpc",
        "//proto:service_java_grpc",
    ],
)

java_library(
    name = "geolocation_module",
    srcs = ["GeolocationModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":geolocation_service_client",
        ":geolocation_service_interface",
        "//server/src/main/java/com/floreina/keyring:environment",
        "//proto:geo_ip_java_grpc",
        "//proto:service_java_grpc",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
    ],
)
