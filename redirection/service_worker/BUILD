load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@pwa_npm//@bazel/typescript:index.bzl", "ts_project")

ts_project(
    name = "service_worker_tsc",
    srcs = ["service_worker.ts"],
)

copy_file(
    name = "service_worker",
    src = ":service_worker_tsc",
    out = "service-worker.js",
    visibility = ["//redirection:internal"],
)
