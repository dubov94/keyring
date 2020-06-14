load("@com_github_atlassian_bazel_tools//multirun:def.bzl", "command", "multirun")
load("@io_bazel_rules_docker//container:container.bzl", "container_image")

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

container_image(
    name = "reverse_proxy",
    base = "@io_docker_index_abiosoft_caddy//image",
    directory = "/root",
    files = ["Caddyfile"],
    ports = ["80", "443"],
    symlinks = {"/etc/Caddyfile": "/root/Caddyfile"},
    workdir = "/root",
)
