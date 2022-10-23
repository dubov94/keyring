load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@pwa_npm//vue-cli-launcher:index.bzl", "vue_cli_launcher", "vue_cli_launcher_test")
load("@rules_pkg//:pkg.bzl", "pkg_tar")

# `filegroup_copy` targets below ensure that all files end up under `bazel-out`.
load("//bazel:files.bzl", "filegroup_copy")
load("//bazel/workspace:substitution.bzl", "status_vars_template")

package_group(
    name = "internal",
    packages = ["//pwa/..."],
)

exports_files([
    "package.json",
    "yarn.lock",
])

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
    output = "vue.config.js",
    template = "vue.config.tmpl.js",
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
    output = "public/metadata.json",
    template = "metadata.tmpl.json",
)

filegroup_copy(
    name = "package_json",
    srcs = ["package.json"],
    visibility = [
        ":internal",
        "//:root",
    ],
)

SOURCES = [
    ":configs",
    ":package_json",
    ":public",
    ":metadata_json",
    ":src",
    ":vue_config",
    "//pwa/service_worker",
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
    visibility = ["//:root"],
)

DEPENDENCIES = [
    "@pwa_npm//@fontsource/material-icons",
    "@pwa_npm//@fontsource/roboto",
    "@pwa_npm//@fontsource/roboto-mono",
    "@pwa_npm//@types/libsodium-wrappers",
    "@pwa_npm//@types/lodash",
    "@pwa_npm//@types/qrcode",
    "@pwa_npm//@types/ua-parser-js",
    "@pwa_npm//@types/uuid",
    "@pwa_npm//@types/vuedraggable",
    "@pwa_npm//@types/vuelidate",
    "@pwa_npm//@types/zxcvbn",
    "@pwa_npm//@reduxjs/toolkit",
    "@pwa_npm//@vue/cli-plugin-babel",
    "@pwa_npm//@vue/cli-plugin-eslint",
    "@pwa_npm//@vue/cli-plugin-pwa",
    "@pwa_npm//@vue/cli-plugin-typescript",
    "@pwa_npm//@vue/cli-plugin-unit-mocha",
    "@pwa_npm//@vue/eslint-config-standard",
    "@pwa_npm//@vue/eslint-config-typescript",
    "@pwa_npm//axios",
    "@pwa_npm//backoff-rxjs",
    "@pwa_npm//camelcase-keys",
    "@pwa_npm//eslint-plugin-vue",
    "@pwa_npm//eslint-plugin-vuetify",
    "@pwa_npm//fp-ts",
    "@pwa_npm//fuse.js",
    "@pwa_npm//libsodium-wrappers",
    "@pwa_npm//lodash",
    # For `ts_swagger_api`.
    "@pwa_npm//portable-fetch",
    "@pwa_npm//qrcode",
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
    "@pwa_npm//uuid",
    # For `ts_swagger_api`.
    "@pwa_npm//url",
    "@pwa_npm//vue",
    "@pwa_npm//vue-cli-plugin-vuetify",
    "@pwa_npm//vue-i18n",
    "@pwa_npm//vue-property-decorator",
    "@pwa_npm//vue-router",
    "@pwa_npm//vuedraggable",
    "@pwa_npm//vuelidate",
    "@pwa_npm//vuetify",
    "@pwa_npm//vuetify-loader",
    "@pwa_npm//workerize-loader",
    "@pwa_npm//zxcvbn",
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
    package_dir = "dist",
)

container_image(
    name = "pwa",
    base = "@io_docker_index_library_nginx//image",
    directory = "/root",
    files = ["nginx.conf"],
    ports = ["8080"],
    symlinks = {"/etc/nginx/nginx.conf": "/root/nginx.conf"},
    tars = [":pkg_tar"],
    workdir = "/root",
)
