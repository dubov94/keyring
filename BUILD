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

command(
    name = "pwa",
    arguments = [
        "serve",
        "--package-json-path=$(rootpath //pwa:package_json)",
    ],
    command = "//pwa:serve",
    data = ["//pwa:package_json"],
)

multirun(
    name = "all_services",
    commands = [
        ":grpc_gateway",
        ":server",
        ":pwa",
    ],
    parallel = True,
)
