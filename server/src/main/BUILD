load("//server:aspectj.bzl", "woven_java_binary")

package(default_visibility = [
    "//:__pkg__",
    "//server:__pkg__",
])

woven_java_binary(
    name = "main",
    jvm_flags = [
        # https://github.com/pgjdbc/pgjdbc/issues/986
        "--add-opens java.base/java.util=ALL-UNNAMED",
    ],
    main_class = "com.floreina.keyring.Launcher",
    resources = [
        "//server/src/main/resources/META-INF:persistence.xml",
        "//server/src/main/resources/templates:code.body.twig",
        "//server/src/main/resources/templates:code.head.twig",
    ],
    runtime_deps = [
        "//server/src/main/java/com/floreina/keyring:app_component",
        "//server/src/main/java/com/floreina/keyring:launcher",
        "@maven//:io_grpc_grpc_netty_shaded",
        "@maven//:io_grpc_grpc_protobuf",
        "@maven//:io_grpc_grpc_stub",
        "@maven//:javax_activation_activation",
        "@maven//:javax_xml_bind_jaxb_api",
        "@maven//:org_hibernate_hibernate_c3p0",
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_slf4j_slf4j_simple",
    ],
)
