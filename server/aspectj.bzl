load("//bazel/java:junit5.bzl", "junit5_test")

def woven_junit5_test(
        name,
        srcs,
        test_package,
        data = [],
        jvm_flags = [],
        resources = [],
        runtime_deps = [],
        deps = []):
    junit5_test(
        name = name,
        srcs = srcs,
        data = data + [
            "//bazel/java:aspectjweaver",
        ],
        jvm_flags = jvm_flags + [
            "-javaagent:$(rootpath //bazel/java:aspectjweaver)",
            # https://www.eclipse.org/aspectj/doc/released/README-194.html
            "--add-opens java.base/java.lang=ALL-UNNAMED",
        ],
        resources = resources + [
            "//server/src/main/resources/META-INF:aop.xml",
        ],
        test_package = test_package,
        runtime_deps = runtime_deps + [
            "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
            "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
        ],
        deps = deps,
    )
