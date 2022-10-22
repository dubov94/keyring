load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@redirection_npm//react-scripts:index.bzl", "react_scripts")
load("//bazel:files.bzl", "filegroup_copy")

exports_files([
    "package.json",
    "yarn.lock",
])

filegroup_copy(
    name = "chdir_js",
    srcs = ["chdir.js"]
)

filegroup_copy(
    name = "public",
    srcs = glob(["public/**"]),
)

filegroup_copy(
    name = "src",
    srcs = glob(["src/**"]),
)

# ESLint configuration produced by `react-scripts` extends `react-app` by default
# (https://github.com/facebook/create-react-app/blob/9802941ff049a28da2682801bc182a29761b71f4/packages/react-scripts/config/webpack.config.js#L783),
# thus a conflict emerges if `react-app` is also specified in package.json (`eslintConfig`):
#
#   * `react_scripts`, being launched from the local `node_modules`, resolves `eslint-plugin-react-app`
#     to the local `node_modules`;
#   * package.json, being copied under `bazel-out`, resolves to the `node_modules` under `bazel-out`.
#
# However, we may want to add `react-app/jest` for Jest eventually.
filegroup_copy(
    name = "package_json",
    srcs = ["package.json"],
)

SOURCES = [
    ":package_json",
    ":public",
    ":src",
]

DEPENDENCIES = [
    "@redirection_npm//@emotion/react",
    "@redirection_npm//@emotion/styled",
    "@redirection_npm//@fontsource/roboto",
    "@redirection_npm//@mui/icons-material",
    "@redirection_npm//@mui/lab",
    "@redirection_npm//@mui/material",
    "@redirection_npm//@types/react",
    "@redirection_npm//@types/react-dom",
    "@redirection_npm//gsap",
    "@redirection_npm//react",
    "@redirection_npm//react-dom",
    "@redirection_npm//typescript",
]

react_scripts(
    name = "serve",
    args = [
        "--node_options=--require=./$(rootpath :chdir_js)",
        "start",
    ],
    data = [":chdir_js"] + SOURCES,
    tags = ["ibazel_notify_changes"],
)
