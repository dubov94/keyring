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
    files = [":entrypoint.sh"],
    ports = ["5001"],
    tars = ["//server/src/main:main_package"],
    workdir = "/root",
)
