load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@io_bazel_rules_go//go:def.bzl", "go_binary")

go_binary(
    name = "main",
    srcs = ["main.go"],
    deps = [
        "@com_github_golang_glog//:go_default_library",
        "@com_github_oschwald_maxminddb_golang//:go_default_library",
        "@org_golang_google_grpc//:go_default_library",
        "@org_golang_x_sync//errgroup:go_default_library",
        "//proto:geo_ip_go_grpc",
    ],
)

container_image(
    name = "ip_geolocation",
    base = "@io_docker_index_maxmindinc_geoipupdate//image",
    cmd = ["./entrypoint.sh"],
    entrypoint = None,
    directory = "/root",
    env = {
        "GEOIPUPDATE_EDITION_IDS": "GeoLite2-City GeoLite2-Country",
    },
    files = [
        "entrypoint.sh",
        ":main",
    ],
    ports = ["5003"],
    workdir = "/root",
)
