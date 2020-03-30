load("//bazel/java:junit5.bzl", "junit5_test")

package(default_testonly = 1)

junit5_test(
    name = "geolocation_service_client_test",
    srcs = ["GeolocationServiceClientTest.java"],
    test_package = "com.floreina.keyring.geolocation",
    deps = [
        "//server/src/main/java/com/floreina/keyring/geolocation:geolocation_service_client",
        "//proto:service_java_grpc",
        "@maven//:com_google_http_client_google_http_client",
        "@maven//:com_google_http_client_google_http_client_gson",
    ],
)
