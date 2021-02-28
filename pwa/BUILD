load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@pwa_npm//vue-cli-launcher:index.bzl", "vue_cli_launcher", "vue_cli_launcher_test")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
# `filegroup_copy` targets below ensure that all files end up under `bazel-out`.
load("//bazel:files.bzl", "filegroup_copy")
load("//bazel/workspace:substitution.bzl", "status_vars_template")

package(default_visibility = ["//:__pkg__"])

SPEC_PATTERNS = [
    "src/**/*.spec.js",
    "src/**/*.spec.ts",
    "src/**/testing/**/*",
]

filegroup_copy(
    name = "src",
    srcs = glob(
        ["src/**/*"],
        exclude = SPEC_PATTERNS,
    ),
)

filegroup_copy(
    name = "specs",
    srcs = glob(SPEC_PATTERNS),
)

filegroup_copy(
    name = "public",
    srcs = glob(["public/**"]),
)

status_vars_template(
    name = "vue_config",
    template = "vue.config.tmpl.js",
    output = "vue.config.js",
)

filegroup_copy(
    name = "configs",
    srcs = [
        ".browserslistrc",
        ".eslintrc.js",
        "babel.config.js",
        "tsconfig.json",
    ],
)

status_vars_template(
    name = "metadata_json",
    template = "metadata.tmpl.json",
    output = "public/metadata.json",
)

status_vars_template(
    name = "service_worker",
    template = "service_worker.tmpl.js",
    output = "service-worker.js",
)

filegroup_copy(
    name = "package_json",
    srcs = ["package.json"],
)

SOURCES = [
    ":configs",
    ":package_json",
    ":public",
    ":metadata_json",
    ":service_worker",
    ":src",
    ":vue_config",
    "//pwa/src/api/definitions:swagger_api",
]

# ESLint indications might be unstable, see
# https://github.com/vuejs/vue-cli/issues/3065.
vue_cli_launcher(
    name = "serve",
    args = [
        "serve",
        "--package-json-path=$(rootpath :package_json)",
    ],
    data = SOURCES,
)

DEPENDENCIES = [
    "@pwa_npm//@types/libsodium-wrappers",
    "@pwa_npm//@types/lodash",
    "@pwa_npm//@types/ua-parser-js",
    "@pwa_npm//@types/vuedraggable",
    "@pwa_npm//@types/vuelidate",
    "@pwa_npm//@reduxjs/toolkit",
    "@pwa_npm//@vue/cli-plugin-babel",
    "@pwa_npm//@vue/cli-plugin-eslint",
    "@pwa_npm//@vue/cli-plugin-pwa",
    "@pwa_npm//@vue/cli-plugin-typescript",
    "@pwa_npm//@vue/cli-plugin-unit-mocha",
    "@pwa_npm//@vue/eslint-config-standard",
    "@pwa_npm//@vue/eslint-config-typescript",
    "@pwa_npm//axios",
    "@pwa_npm//camelcase-keys",
    "@pwa_npm//eslint-plugin-vue",
    "@pwa_npm//fp-ts",
    "@pwa_npm//libsodium-wrappers",
    "@pwa_npm//lodash",
    # For `ts_swagger_api`.
    "@pwa_npm//portable-fetch",
    "@pwa_npm//redux-observable",
    "@pwa_npm//reflect-metadata",
    "@pwa_npm//register-service-worker",
    "@pwa_npm//rxjs",
    "@pwa_npm//sass-loader",
    "@pwa_npm//snakecase-keys",
    "@pwa_npm//trianglify",
    "@pwa_npm//ts-essentials",
    "@pwa_npm//tsyringe",
    "@pwa_npm//typesafe-actions",
    "@pwa_npm//ua-parser-js",
    # For `ts_swagger_api`.
    "@pwa_npm//url",
    "@pwa_npm//vue",
    "@pwa_npm//vue-i18n",
    "@pwa_npm//vue-property-decorator",
    "@pwa_npm//vue-router",
    "@pwa_npm//vuedraggable",
    "@pwa_npm//vuelidate",
    "@pwa_npm//vuetify",
    "@pwa_npm//workerize-loader",
]

vue_cli_launcher_test(
    name = "unit_tests",
    args = [
        "test:unit",
        "--package-json-path=$(rootpath :package_json)",
        "pwa/src/**/*.spec.{js,ts}",
    ],
    data = [
        ":specs",
        "@pwa_npm//@types/chai",
        "@pwa_npm//@types/mocha",
        "@pwa_npm//@vue/test-utils",
        "@pwa_npm//chai",
        "@pwa_npm//simple-statistics",
        "@pwa_npm//ts-mockito",
    ] + SOURCES + DEPENDENCIES,
)

vue_cli_launcher(
    name = "dist",
    args = [
        "build",
        "--dest=$(@D)",
        "--resolve-dest-by-cwd",
        "--package-json-path=$(execpath :package_json)",
    ],
    data = SOURCES + DEPENDENCIES,
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
