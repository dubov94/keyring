load("//bazel/java:junit5.bzl", "junit5_test")
load("@rules_pkg//:pkg.bzl", "pkg_tar")

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

def _java_binary_runner_impl(context):
    runner = context.actions.declare_file(context.attr.name)
    expanded_jvm_flags = []
    for jvm_flag in context.attr.jvm_flags:
        expanded_jvm_flags.append(
            context.expand_location(
                jvm_flag,
                context.attr.deps,
            ),
        )
    context.actions.write(
        output = runner,
        content = "java {} -jar {}".format(
            " ".join(expanded_jvm_flags),
            context.attr.deploy_jar.label.name,
        ),
    )
    return [DefaultInfo(files = depset([runner]))]

java_binary_runner = rule(
    implementation = _java_binary_runner_impl,
    attrs = {
        "deploy_jar": attr.label(allow_single_file = True),
        "jvm_flags": attr.string_list(),
        "deps": attr.label_list(),
    },
)

def woven_java_binary(
        name,
        main_class,
        data = [],
        jvm_flags = [],
        resources = [],
        runtime_deps = []):
    binary_data = data + [ASPECTJ_WEAVER]
    binary_jvm_flags = jvm_flags + ASPECTJ_JVM_FLAGS
    native.java_binary(
        name = name,
        data = binary_data,
        jvm_flags = binary_jvm_flags,
        main_class = main_class,
        resources = resources + [AOP_XML],
        runtime_deps = runtime_deps + ASPECTS,
    )
    data_package_target_name = "{}_data_package".format(name)
    pkg_tar(
        name = data_package_target_name,
        srcs = binary_data,
        strip_prefix = ".",
    )
    runner_target_name = "{}_runner".format(name)
    deploy_jar_target_name = "{}_deploy.jar".format(name)
    java_binary_runner(
        name = runner_target_name,
        deploy_jar = deploy_jar_target_name,
        jvm_flags = binary_jvm_flags,
        deps = binary_data,
    )
    pkg_tar(
        name = "{}_package".format(name),
        srcs = [
            deploy_jar_target_name,
            runner_target_name,
        ],
        deps = [data_package_target_name],
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
