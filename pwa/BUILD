load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "npm_package_bin")
load("@io_bazel_rules_docker//container:container.bzl", "container_image", "container_layer")
load("@pwa_npm//@vue/cli-service:index.bzl", "vue_cli_service", "vue_cli_service_test")
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

genrule(
    name = "change_directory_js",
    outs = ["change_directory.js"],
    cmd = "echo 'process.chdir(__dirname)' > $@",
)

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
    ":src",
    ":vue_config",
    "//pwa/service_worker",
    "//pwa/src/api/definitions:swagger_api",
]

DEPENDENCIES = [
    "@pwa_npm//@fontsource/material-icons",
    "@pwa_npm//@fontsource/material-icons-outlined",
    "@pwa_npm//@fontsource/roboto",
    "@pwa_npm//@fontsource/roboto-mono",
    "@pwa_npm//@types/file-saver",
    "@pwa_npm//@types/libsodium-wrappers-sumo",
    "@pwa_npm//@types/lodash",
    "@pwa_npm//@types/papaparse",
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
    "@pwa_npm//core-js",
    "@pwa_npm//camelcase-keys",
    "@pwa_npm//eslint-plugin-vue",
    "@pwa_npm//eslint-plugin-vuetify",
    "@pwa_npm//file-saver",
    "@pwa_npm//fp-ts",
    "@pwa_npm//fuse.js",
    "@pwa_npm//libsodium-wrappers-sumo",
    "@pwa_npm//lodash",
    "@pwa_npm//papaparse",
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
    "@pwa_npm//vue-svg-loader",
    # For `vue-svg-loader`.
    "@pwa_npm//vue-template-compiler",
    "@pwa_npm//vuedraggable",
    "@pwa_npm//vuelidate",
    "@pwa_npm//vuetify",
    "@pwa_npm//vuetify-loader",
    "@pwa_npm//workerize-loader",
    "@pwa_npm//zxcvbn",
]

# ESLint indications might be unstable, see
# https://github.com/vuejs/vue-cli/issues/3065.
vue_cli_service(
    name = "serve",
    args = [
        "--node_options=--require=./$(rootpath :change_directory_js)",
        "serve",
    ],
    data = [":change_directory_js"] + SOURCES + DEPENDENCIES,
    visibility = ["//:root"],
)

vue_cli_service_test(
    name = "unit_tests",
    args = [
        "--node_options=--require=./$(rootpath :change_directory_js)",
        "test:unit",
        "pwa/src/**/*.spec.{js,ts}",
    ],
    data = [":change_directory_js"] + [
        ":specs",
        "@pwa_npm//@types/chai",
        "@pwa_npm//@types/mocha",
        "@pwa_npm//@vue/test-utils",
        "@pwa_npm//chai",
        "@pwa_npm//simple-statistics",
        "@pwa_npm//ts-mockito",
    ] + SOURCES + DEPENDENCIES,
)

nodejs_binary(
    name = "vue_cli_service",
    data = [
        "vue_cli_service.js",
        "@pwa_npm//@vue/cli-service",
    ],
    entry_point = "vue_cli_service.js",
)

npm_package_bin(
    name = "dist",
    args = [
        "--node_options=--require=./$(execpath :change_directory_js)",
        "build",
    ],
    data = [":change_directory_js"] + SOURCES + DEPENDENCIES,
    output_dir = True,
    tool = ":vue_cli_service",
)

pkg_tar(
    name = "pkg_tar",
    srcs = [":dist"],
    package_dir = "dist",
    # To enable `If-Modified-Since` and `ETag`.
    #
    # Previously NGINX caching had to be disabled as
    # `ETag` would be virtually constant for certain
    # assets. That was happening due to:
    #
    # - `pkg_tar` having no support of `stamp`, thus
    #   always yielding constant `mtime`;
    # - NGINX computing `ETag` value as concatentation
    #   of `mtime` and asset length
    #   (src/http/ngx_http_core_module.c);
    # - majority of service worker changes being updates
    #   of the precache manifest fixed-length reference.
    stamp = 1,
)

container_layer(
    name = "dist_layer",
    directory = "/root",
    enable_mtime_preservation = True,
    tars = [":pkg_tar"],
)

container_layer(
    name = "nginx_layer",
    directory = "/root",
    files = ["nginx.conf"],
    symlinks = {"/etc/nginx/nginx.conf": "/root/nginx.conf"},
)

container_image(
    name = "pwa",
    base = "@io_docker_index_library_nginx//image",
    layers = [
        ":dist_layer",
        ":nginx_layer",
    ],
    ports = ["8080"],
    workdir = "/root",
)
