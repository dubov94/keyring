load("@com_github_atlassian_bazel_tools//multirun:def.bzl", "command", "multirun")

exports_files(["WORKSPACE"])

command(
    name = "server",
    command = "//server/src/main",
)

command(
    name = "grpc_gateway",
    command = "//grpc_gateway:main",
)

multirun(
    name = "backends",
    commands = [
        ":grpc_gateway",
        ":server",
    ],
    parallel = True,
)
