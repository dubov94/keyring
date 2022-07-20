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
    files = ["//server/main:entrypoint.sh"],
    ports = ["5001"],
    tars = ["//server/main:main_package"],
    workdir = "/root",
)

container_image(
    name = "janitor",
    base = "@io_docker_index_library_openjdk//image",
    cmd = ["./entrypoint.sh"],
    directory = "/root",
    files = ["//server/janitor:entrypoint.sh"],
    tars = ["//server/janitor:janitor_package"],
    workdir = "/root",
)

container_image(
    name = "liquibase",
    base = "@io_docker_index_liquibase_liquibase//image",
    # https://www.liquibase.com/blog/using-liquibase-in-kubernetes
    cmd = [
        "sh",
        "-c",
        " ".join([
            "docker-entrypoint.sh",
            "--url=jdbc:postgresql://postgres/keyring",
            "--username=application",
            "--password=${POSTGRES_PASSWORD}",
            "--classpath=/liquibase/changelog",
            "--changelog-file=changelog.postgresql.sql",
            "update",
        ]),
    ],
    directory = "/root",
    files = ["changelog.postgresql.sql"],
    symlinks = {
        "/liquibase/changelog/changelog.postgresql.sql": "/root/changelog.postgresql.sql",
    },
)
