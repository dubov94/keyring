load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "npm_package_bin")
load("@pwa_npm//@bazel/typescript:index.bzl", "ts_project")
load("//bazel/workspace:substitution.bzl", "status_vars_template")

ts_project(
    name = "service_worker_tsc",
    srcs = ["service_worker.tmpl.ts"],
    deps = [
        "@pwa_npm//@types/workbox-sw",
        "@pwa_npm//dexie",
    ],
)

nodejs_binary(
    name = "import_replacer",
    data = [
        "@pwa_npm//escodegen",
        "@pwa_npm//espree",
    ],
    entry_point = "import_replacer.js",
)

npm_package_bin(
    name = "service_worker_deps",
    args = [
        "$(execpath //pwa:package_json)",
        "$(execpath :service_worker_tsc)",
    ],
    data = [
        ":service_worker_tsc",
        "//pwa:package_json",
    ],
    stdout = "service_worker_deps.js",
    tool = ":import_replacer",
)

status_vars_template(
    name = "service_worker",
    output = "service-worker.js",
    template = ":service_worker_deps",
    visibility = ["//pwa:internal"],
)
