package(default_visibility = ["//visibility:public"])

exports_files([
    "substitution.bzl",
])

py_binary(
    name = "vars_to_json",
    srcs = ["vars_to_json.py"],
)

genrule(
    name = "stable_status",
    outs = ["stable_status.json"],
    cmd = "cat bazel-out/stable-status.txt | $(execpath :vars_to_json) > $@",
    stamp = True,
    tools = [":vars_to_json"],
)

py_binary(
    name = "substitution",
    srcs = ["substitution.py"],
)
