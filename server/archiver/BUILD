load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@io_bazel_rules_docker//docker/util:run.bzl", "container_run_and_commit")
load("@io_bazel_rules_go//go:def.bzl", "go_binary")

go_binary(
    name = "main",
    srcs = ["main.go"],
    deps = [
        "@com_github_golang_glog//:go_default_library",
        "@com_google_cloud_go_storage//:go_default_library",
        "@org_golang_google_api//option:go_default_library",
    ],
)

container_image(
    name = "archiver_image",
    base = "@io_docker_index_library_postgres//image",
    directory = "/root",
    files = [
        "entrypoint.sh",
        ":main",
    ],
    workdir = "/root",
)

container_run_and_commit(
    name = "archiver_ca",
    image = ":archiver_image.tar",
    commands = [" && ".join([
        "apt update",
        "apt install --assume-yes --no-install-recommends ca-certificates",
    ])],
    docker_run_flags = ["--entrypoint=''"],
)

container_image(
    name = "archiver",
    base = ":archiver_ca",
    entrypoint = ["./entrypoint.sh"],
)
