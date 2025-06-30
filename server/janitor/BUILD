load("//server:aspectj.bzl", "woven_java_binary")
load("//server/janitor:aspectj.bzl", "ASPECTS")

exports_files([
    "aspectj.bzl",
    "entrypoint.sh",
])

java_library(
    name = "environment",
    srcs = ["Environment.java"],
    deps = ["@maven//:com_beust_jcommander"],
)

java_library(
    name = "app_module",
    srcs = ["AppModule.java"],
    plugins = ["//bazel/java:dagger_compiler"],
    deps = [
        ":environment",
        "//server/main:arithmetic",
        "//server/main:chronometry",
        # For `hibernate.hbm2ddl.auto`.
        "//server/main/entities",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:redis_clients_jedis",
    ],
)

java_library(
    name = "app_component",
    srcs = ["AppComponent.java"],
    plugins = ["//bazel/java:dagger_compiler"],
    deps = [
        ":app_module",
        ":environment",
        "//server/janitor/tasks:activated_session_expiration",
        "//server/janitor/tasks:deleted_user_eviction",
        "//server/janitor/tasks:initiated_session_expiration",
        "//server/janitor/tasks:mail_token_eviction",
        "//server/janitor/tasks:otp_params_eviction",
        "//server/janitor/tasks:otp_token_eviction",
        "//server/janitor/tasks:pending_user_expiration",
        "//server/janitor/tasks:session_record_eviction",
        "//server/janitor/tasks:stale_account_expiration",
        "@maven//:com_google_dagger_dagger",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_binary(
    name = "main",
    srcs = ["Janitor.java"],
    main_class = "keyring.server.janitor.Janitor",
    deps = [
        ":app_component",
        ":environment",
        "//server/main/aspects:storage_manager_aspect",
        "@maven//:com_beust_jcommander",
        "@maven//:com_google_guava_guava",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

woven_java_binary(
    name = "janitor",
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    jvm_flags = [
        # https://github.com/pgjdbc/pgjdbc/issues/986
        "--add-opens java.base/java.util=ALL-UNNAMED",
    ],
    main_class = "keyring.server.janitor.Janitor",
    resources = ["//server/java/META-INF:persistence.xml"],
    visibility = [
        "//:root",
        "//server:internal",
    ],
    runtime_deps = [
        ":app_component",
        ":main",
        "@maven//:com_google_guava_guava",
        "@maven//:com_zaxxer_HikariCP",
        "@maven//:org_hibernate_hibernate_hikaricp",
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_slf4j_slf4j_simple",
    ],
)
