load("@io_bazel_rules_openapi//openapi:openapi.bzl", "openapi_gen")

TS_SWAGGER_API_OUTS = [
    "api.ts",
    "configuration.ts",
    "custom.d.ts",
    "index.ts",
]

def ts_swagger_api(name, spec):
    archive_target_name = "{}_archive".format(name)

    openapi_gen(
        name = archive_target_name,
        # Requires 'portable-fetch' and 'url'.
        language = "typescript-fetch",
        spec = spec,
    )

    native.genrule(
        name = name,
        srcs = [archive_target_name],
        outs = TS_SWAGGER_API_OUTS,
        cmd = "unzip $< {} -d $(@D)".format(" ".join(TS_SWAGGER_API_OUTS)),
    )
