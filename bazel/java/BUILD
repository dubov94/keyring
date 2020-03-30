package(default_visibility = ["//visibility:public"])

exports_files([
    "junit5.bzl",
    "packaging.bzl",
])

java_plugin(
    name = "hibernate_jpamodelgen",
    generates_api = True,
    processor_class = "org.hibernate.jpamodelgen.JPAMetaModelEntityProcessor",
    deps = [
        "@maven//:javax_annotation_javax_annotation_api",
        "@maven//:javax_xml_bind_jaxb_api",
        "@maven//:org_hibernate_hibernate_jpamodelgen",
    ],
)

java_plugin(
    name = "dagger_compiler",
    generates_api = True,
    processor_class = "dagger.internal.codegen.ComponentProcessor",
    deps = [
        "@maven//:com_google_dagger_dagger_compiler",
    ],
)

genrule(
    name = "aspectjweaver",
    srcs = ["@maven//:org_aspectj_aspectjweaver"],
    outs = ["aspectjweaver.jar"],
    cmd = "cp $(execpath @maven//:org_aspectj_aspectjweaver) $@",
)
