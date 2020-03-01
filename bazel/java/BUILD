package(default_visibility = ["//visibility:public"])

exports_files(["junit5.bzl"])

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
