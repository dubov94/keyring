java_library(
    name = "template_renderer_factory",
    srcs = ["TemplateRendererFactory.java"],
)

java_library(
    name = "mail_vc_body_renderer_factory",
    srcs = ["MailVcBodyRendererFactory.java"],
    visibility = ["//server:internal"],
    deps = [
        ":template_renderer_factory",
        "@maven//:org_jtwig_jtwig_core",
    ],
)

java_library(
    name = "mail_vc_head_renderer_factory",
    srcs = ["MailVcHeadRendererFactory.java"],
    visibility = ["//server:internal"],
    deps = [
        ":template_renderer_factory",
        "@maven//:org_jtwig_jtwig_core",
    ],
)

java_library(
    name = "templates_module",
    srcs = ["TemplatesModule.java"],
    plugins = [
        "//bazel/java:dagger_compiler",
    ],
    visibility = ["//server:internal"],
    deps = [
        ":mail_vc_body_renderer_factory",
        ":mail_vc_code_head_renderer_factory",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:org_jtwig_jtwig_core",
    ],
)
