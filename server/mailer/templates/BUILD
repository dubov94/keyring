java_library(
    name = "templates_module",
    srcs = ["TemplatesModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = ["//server:internal"],
    deps = [
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_jtwig_jtwig_core",
    ],
)
