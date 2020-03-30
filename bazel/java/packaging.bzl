load("@rules_pkg//:pkg.bzl", "pkg_tar")

def _java_runner_impl(context):
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

java_runner = rule(
    implementation = _java_runner_impl,
    attrs = {
        "deploy_jar": attr.label(allow_single_file = True),
        "jvm_flags": attr.string_list(),
        "deps": attr.label_list(),
    },
)

def java_package(name, deploy_jar, data, jvm_flags):
    data_tar_name = "{}_data_tar".format(name)
    pkg_tar(
        name = data_tar_name,
        srcs = data,
        strip_prefix = ".",
    )
    runner_name = "{}_runner".format(name)
    java_runner(
        name = runner_name,
        deploy_jar = deploy_jar,
        jvm_flags = jvm_flags,
        deps = data,
    )
    pkg_tar(
        name = name,
        srcs = [
            deploy_jar,
            runner_name,
        ],
        deps = [data_tar_name],
    )
