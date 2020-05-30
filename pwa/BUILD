load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@pwa_npm//vue-cli-launcher:index.bzl", "vue_cli_launcher")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
load("//bazel:files.bzl", "filegroup_copy")

copy_file(
    name = "stable_status",
    src = "//bazel/workspace:stable_status",
    out = "stable_status.json",
)

filegroup_copy(
    name = "src",
    srcs = glob(["src/**/*"]),
)

filegroup_copy(
    name = "public",
    srcs = glob(["public/**/*"]),
)

filegroup_copy(
    name = "configs",
    srcs = [
        ".browserslistrc",
        ".eslintrc.js",
        "babel.config.js",
        "tsconfig.json",
        "vue.config.js",
    ],
)

# `filegroup_copy` ensures all files end up under `bazel-out`,
# which is where `stable_status` output resides. This way we
# can reference `stable_status.js` from `vue.config.js`
# directly.
filegroup_copy(
    name = "package_json",
    srcs = ["package.json"],
)

vue_cli_launcher(
    name = "serve",
    args = [
        "serve",
        "--package-json-path=$(rootpath :package_json)",
    ],
    data = [
        ":configs",
        ":package_json",
        ":public",
        ":src",
        ":stable_status",
    ],
)

vue_cli_launcher(
    name = "dist",
    args = [
        "build",
        "--dest=$(@D)",
        "--resolve-dest-by-cwd",
        "--package-json-path=$(execpath :package_json)",
    ],
    data = [
        ":configs",
        ":package_json",
        ":public",
        ":src",
        ":stable_status",
        "@pwa_npm//@vue/cli-plugin-babel",
        "@pwa_npm//@vue/cli-plugin-eslint",
        "@pwa_npm//@vue/cli-plugin-pwa",
        "@pwa_npm//@vue/cli-plugin-typescript",
        "@pwa_npm//@vue/cli-plugin-unit-mocha",
        "@pwa_npm//@vue/eslint-config-standard",
        "@pwa_npm//@vue/eslint-config-typescript",
        "@pwa_npm//eslint-plugin-vue",
        "@pwa_npm//register-service-worker",
        "@pwa_npm//sass-loader",
        "@pwa_npm//vue",
        "@pwa_npm//vue-property-decorator",
        "@pwa_npm//vue-router",
        "@pwa_npm//vuex",
    ],
    output_dir = True,
)

pkg_tar(
    name = "pkg_tar",
    srcs = [":dist"],
)

container_image(
    name = "pwa",
    base = "@io_docker_index_abiosoft_caddy//image",
    directory = "/root",
    files = ["Caddyfile"],
    ports = ["8080"],
    symlinks = {"/etc/Caddyfile": "/root/Caddyfile"},
    tars = [":pkg_tar"],
    workdir = "/root",
)
