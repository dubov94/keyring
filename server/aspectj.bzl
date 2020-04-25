load("//bazel/java:junit5.bzl", "junit5_test")
load("//bazel/java:packaging.bzl", "java_package")

ASPECTJ_WEAVER = "//bazel/java:aspectjweaver"
ASPECTJ_JVM_FLAGS = [
    "-javaagent:$(rootpath //bazel/java:aspectjweaver)",
    # https://www.eclipse.org/aspectj/doc/released/README-194.html
    "--add-opens java.base/java.lang=ALL-UNNAMED",
]
AOP_XML = "//server/src/main/resources/META-INF:aop.xml"
ASPECTS = [
    "//server/src/main/java/com/floreina/keyring/aspects:validate_user_aspect",
    "//server/src/main/java/com/floreina/keyring/aspects:storage_manager_aspect",
]

def woven_java_binary(
        name,
        main_class,
        data = [],
        jvm_flags = [],
        resources = [],
        runtime_deps = []):
    all_data = data + [ASPECTJ_WEAVER]
    all_jvm_flags = jvm_flags + ASPECTJ_JVM_FLAGS
    native.java_binary(
        name = name,
        data = all_data,
        jvm_flags = all_jvm_flags,
        main_class = main_class,
        resources = resources + [AOP_XML],
        runtime_deps = runtime_deps + ASPECTS,
    )
    java_package(
        name = "{}_package".format(name),
        deploy_jar = "{}_deploy.jar".format(name),
        data = all_data,
        jvm_flags = all_jvm_flags,
    )

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
        data = data + [ASPECTJ_WEAVER],
        jvm_flags = jvm_flags + ASPECTJ_JVM_FLAGS,
        resources = resources + [AOP_XML],
        test_package = test_package,
        runtime_deps = runtime_deps + ASPECTS,
        deps = deps,
    )