java_library(
    name = "turnstile",
    srcs = [
        "TurnstileValidator.java",
        "TurnstileValidatorBuilder.java",
    ],
    visibility = ["//server:internal"],
    deps = [
        ":turnstile_exception",
        ":turnstile_request",
        ":turnstile_response",
        "@maven//:com_google_guava_guava",
        "@maven//:com_google_http_client_google_http_client",
        "@maven//:com_google_http_client_google_http_client_gson",
    ],
)

java_library(
    name = "turnstile_response",
    srcs = [
        "TurnstileError.java",
        "TurnstileResponse.java",
    ],
    plugins = [
        "//bazel/java:auto_value",
    ],
    deps = [
        "@maven//:com_google_auto_value_auto_value_annotations",
        "@maven//:com_google_guava_guava",
    ],
)

java_library(
    name = "turnstile_request",
    srcs = [
        "TurnstileRequest.java",
    ],
    plugins = [
        "//bazel/java:auto_value",
    ],
    deps = [
        "@maven//:com_google_auto_value_auto_value_annotations",
    ],
)

java_library(
    name = "turnstile_exception",
    srcs = [
        "TurnstileException.java",
    ],
)
