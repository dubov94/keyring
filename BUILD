load("@com_github_atlassian_bazel_tools//multirun:def.bzl", "multirun")

package_group(
    name = "project",
    packages = ["//..."],
)

package_group(
    name = "root",
    packages = ["//"],
)

exports_files(["WORKSPACE"])

alias(
    name = "server",
    actual = "//server/main",
)

alias(
    name = "grpc_gateway",
    actual = "//grpc_gateway:main",
)

alias(
    name = "mailer",
    actual = "//server/mailer:main",
)

alias(
    name = "janitor",
    actual = "//server/janitor",
)

multirun(
    name = "backends",
    commands = [
        ":grpc_gateway",
        ":mailer",
        ":server",
    ],
    parallel = True,
)

alias(
    name = "pwa",
    actual = "//pwa:serve",
)
