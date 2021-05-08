load("@io_bazel_rules_docker//container:container.bzl", "container_image")

package_group(
    name = "internal",
    packages = ["//server/..."],
)

exports_files(["aspectj.bzl"])

container_image(
    name = "server",
    base = "@io_docker_index_library_openjdk//image",
    cmd = ["./entrypoint.sh"],
    directory = "/root",
    files = ["entrypoint.sh"],
    ports = ["5001"],
    tars = ["//server/main:main_package"],
    workdir = "/root",
)
