load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@io_bazel_rules_docker//docker/util:run.bzl", "container_run_and_commit")
load("@ip_geolocation_pip//:requirements.bzl", "requirement")
load("@subpar//:subpar.bzl", "par_binary")

par_binary(
    name = "main",
    srcs = ["main.py"],
    deps = [
        requirement("bottle"),
        requirement("maxminddb"),
    ],
)

container_run_and_commit(
    name = "geoipupdate_with_python",
    commands = ["apk add --no-cache python3"],
    docker_run_flags = ["--entrypoint=\"\""],
    image = "@io_docker_index_maxmindinc_geoipupdate//image",
)

container_image(
    name = "ip_geolocation",
    base = ":geoipupdate_with_python",
    cmd = ["./entrypoint.sh"],
    directory = "/root",
    entrypoint = None,
    env = {
        "GEOIPUPDATE_EDITION_IDS": "GeoLite2-City GeoLite2-Country",
    },
    files = [
        "entrypoint.sh",
        ":main.par",
    ],
    ports = ["5003"],
    workdir = "/root",
)
