load("@io_bazel_rules_docker//container:container.bzl", "container_image")
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
    name = "restorer",
    base = "@io_docker_index_library_postgres//image",
    directory = "/root",
    entrypoint = ["./entrypoint.sh"],
    files = [
        "entrypoint.sh",
        ":main",
    ],
    workdir = "/root",
)
