def status_vars_template(name, template, output):
  native.genrule(
    name = name,
    srcs = [
      "//bazel/workspace:stable_status",
      template,
    ],
    outs = [output],
    cmd = "$(execpath //bazel/workspace:substitution) $(execpath {}) $(execpath //bazel/workspace:stable_status) > $@".format(template),
    tools = ["//bazel/workspace:substitution"],
  )
