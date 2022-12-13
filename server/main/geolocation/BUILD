java_library(
    name = "geolocation_service_interface",
    srcs = ["GeolocationServiceInterface.java"],
    visibility = ["//server:internal"],
    deps = ["//proto:service_java_grpc"],
)

java_library(
    name = "geolocation_service_client",
    srcs = ["GeolocationServiceClient.java"],
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
    visibility = ["//server:internal"],
    deps = [
        ":geolocation_service_client",
        ":geolocation_service_interface",
        "//proto:geo_ip_java_grpc",
        "//proto:service_java_grpc",
        "//server/main:environment",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
    ],
)
