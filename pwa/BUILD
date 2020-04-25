load("@pwa_npm//vue-cli-launcher:index.bzl", "vue_cli_launcher")

filegroup(
    name = "src",
    srcs = glob(["src/**/*"]),
)

filegroup(
    name = "public",
    srcs = glob(["public/**/*"]),
)

filegroup(
    name = "configs",
    srcs = [
        ".browserslistrc",
        ".eslintrc.js",
        "babel.config.js",
        "tsconfig.json",
    ],
)

filegroup(
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
    ],
)

vue_cli_launcher(
    name = "package",
    args = [
        "build",
        "--dest=$(@D)",
        "--package-json-path=$(execpath :package_json)",
    ],
    data = [
        ":configs",
        ":package_json",
        ":public",
        ":src",
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
