def junit5_test(
        name,
        srcs,
        test_package,
        deps = None,
        runtime_deps = None,
        data = None,
        resources = None,
        jvm_flags = None):
    deps = deps or []
    runtime_deps = runtime_deps or []
    native.java_test(
        name = name,
        srcs = srcs,
        use_testrunner = False,
        main_class = "org.junit.platform.console.ConsoleLauncher",
        args = ["--select-package", test_package],
        deps = deps + [
            "@maven//:org_apiguardian_apiguardian_api",
            "@maven//:org_junit_jupiter_junit_jupiter_api",
            "@maven//:org_junit_jupiter_junit_jupiter_engine",
            "@maven//:org_junit_jupiter_junit_jupiter_params",
            "@maven//:org_junit_platform_junit_platform_suite_api",
            "@maven//:org_opentest4j_opentest4j",
        ],
        runtime_deps = runtime_deps + [
            "@maven//:org_junit_platform_junit_platform_commons",
            "@maven//:org_junit_platform_junit_platform_console",
            "@maven//:org_junit_platform_junit_platform_engine",
            "@maven//:org_junit_platform_junit_platform_launcher",
            "@maven//:org_junit_platform_junit_platform_suite_api",
        ],
        data = data,
        resources = resources,
        jvm_flags = jvm_flags,
    )
