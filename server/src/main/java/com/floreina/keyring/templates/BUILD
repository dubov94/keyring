java_library(
    name = "template_renderer_factory",
    srcs = ["TemplateRendererFactory.java"],
)

java_library(
    name = "code_body_renderer_factory",
    srcs = ["CodeBodyRendererFactory.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":template_renderer_factory",
        "@maven//:org_jtwig_jtwig_core",
    ],
)

java_library(
    name = "code_head_renderer_factory",
    srcs = ["CodeHeadRendererFactory.java"],
    visibility = [
        "//server/src/main/java/com/floreina/keyring:__pkg__",
    ],
    deps = [
        ":template_renderer_factory",
        "@maven//:org_jtwig_jtwig_core",
    ],
)
