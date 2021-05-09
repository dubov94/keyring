load("//bazel/java:junit5.bzl", "junit5_test")
load("//bazel/java:packaging.bzl", "java_package")

ASPECTJ_WEAVER = "//bazel/java:aspectjweaver"
ASPECTJ_JVM_FLAGS = [
    "-javaagent:$(rootpath //bazel/java:aspectjweaver)",
    # https://www.eclipse.org/aspectj/doc/released/README-194.html
    "--add-opens java.base/java.lang=ALL-UNNAMED",
]

def woven_java_binary(
        name,
        aop_xml,
        aspects,
        main_class,
        data = [],
        jvm_flags = [],
        resources = [],
        runtime_deps = [],
        visibility = None):
    all_data = data + [ASPECTJ_WEAVER]
    all_jvm_flags = jvm_flags + ASPECTJ_JVM_FLAGS
    native.java_binary(
        name = name,
        data = all_data,
        jvm_flags = all_jvm_flags,
        main_class = main_class,
        resources = resources + [aop_xml],
        runtime_deps = runtime_deps + aspects,
        visibility = visibility,
    )
    java_package(
        name = "{}_package".format(name),
        deploy_jar = "{}_deploy.jar".format(name),
        data = all_data,
        jvm_flags = all_jvm_flags,
        visibility = visibility,
    )

def woven_junit5_test(
        name,
        srcs,
        aop_xml,
        aspects,
        test_package,
        data = [],
        jvm_flags = [],
        resources = [],
        runtime_deps = [],
        deps = []):
    junit5_test(
        name = name,
        srcs = srcs,
        data = data + [ASPECTJ_WEAVER],
        jvm_flags = jvm_flags + ASPECTJ_JVM_FLAGS,
        resources = resources + [aop_xml],
        test_package = test_package,
        runtime_deps = runtime_deps + aspects,
        deps = deps,
    )
