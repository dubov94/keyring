load("@io_bazel_rules_docker//container:container.bzl", "container_image")

exports_files(
    ["aspectj.bzl"],
    visibility = ["//server:__subpackages__"],
)

package_group(
    name = "sources",
    packages = ["//server/src/..."],
)

container_image(
    name = "server",
    base = "@io_docker_index_library_openjdk//image",
    cmd = ["./entrypoint.sh"],
    directory = "/root",
    env = {"MODULE_ENVIRONMENT": "production"},
    files = [":entrypoint.sh"],
    tars = ["//server/src/main:main_package"],
    ports = ["591"],
    workdir = "/root",
)