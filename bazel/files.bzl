def _filegroup_copy_impl(context):
    inputs = []
    for source in context.attr.srcs:
        for item in source.files.to_list():
            inputs.append(item)
    outputs = []
    for item in inputs:
        target = context.actions.declare_file(
            item.short_path[len(context.attr.root) + 1:],
        )
        outputs.append(target)
        context.actions.run_shell(
            outputs = [target],
            inputs = [item],
            arguments = [item.path, target.path],
            command = "cp $1 $2",
        )
    return [
        DefaultInfo(
            files = depset(outputs),
            runfiles = context.runfiles(files = outputs),
        ),
    ]

_filegroup_copy = rule(
    implementation = _filegroup_copy_impl,
    attrs = {
        "root": attr.string(),
        "srcs": attr.label_list(allow_files = True),
    },
)

def filegroup_copy(name, srcs):
    _filegroup_copy(
        name = name,
        root = native.package_name(),
        srcs = srcs,
    )
