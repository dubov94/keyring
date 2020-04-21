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
        "@pwa_npm//:node_modules",
    ],
)

vue_cli_launcher(
    name = "build",
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
        "@pwa_npm//:node_modules",
    ],
    output_dir = True,
)
