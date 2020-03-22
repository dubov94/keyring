java_binary(
    name = "main",
    data = [
        "//bazel/java:aspectjweaver",
    ],
    jvm_flags = [
        "-javaagent:$(rootpath //bazel/java:aspectjweaver)",
        # https://www.eclipse.org/aspectj/doc/released/README-194.html
        "--add-opens java.base/java.lang=ALL-UNNAMED",
        # https://github.com/pgjdbc/pgjdbc/issues/986
        "--add-opens java.base/java.util=ALL-UNNAMED",
    ],
    main_class = "com.floreina.keyring.Launcher",
    resources = [
        "//server/src/main/resources/META-INF:aop.xml",
        "//server/src/main/resources/META-INF:persistence.xml",
        "//server/src/main/resources/templates:code.head.twig",
        "//server/src/main/resources/templates:code.body.twig",
    ],
    runtime_deps = [
        "//server/src/main/java/com/floreina/keyring:component",
        "//server/src/main/java/com/floreina/keyring:launcher",
        "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
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
