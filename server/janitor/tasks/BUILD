load("//server:aspectj.bzl", "woven_junit5_test")
load("//server/janitor:aspectj.bzl", "ASPECTS")

package(default_visibility = ["//server:internal"])

java_library(
    name = "deleted_users",
    srcs = ["DeletedUsers.java"],
    deps = [
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:user",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "deleted_users_test",
    srcs = ["DeletedUsersTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_testcontainers_postgresql",
    ],
    deps = [
        ":deleted_users",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:key",
        "//server/main/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:org_aspectj_aspectjrt",
    ],
)

java_library(
    name = "disabled_session_records",
    srcs = ["DisabledSessionRecords.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "disabled_session_records_test",
    srcs = ["DisabledSessionRecordsTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_testcontainers_postgresql",
    ],
    deps = [
        ":disabled_session_records",
        "//server/main:chronometry",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "mail_token_eviction",
    srcs = ["MailTokenEviction.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:mail_token",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "expired_pending_users",
    srcs = ["ExpiredPendingUsers.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:user",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "expired_pending_users_test",
    srcs = ["ExpiredPendingUsersTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
        "@maven//:org_testcontainers_postgresql",
    ],
    deps = [
        ":expired_pending_users",
        "//server/main:chronometry",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:key",
        "//server/main/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
    ],
)

java_library(
    name = "expired_session_records",
    srcs = ["ExpiredSessionRecords.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:session",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "expired_otp_params",
    srcs = ["ExpiredOtpParams.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:otp_params",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "expired_otp_tokens",
    srcs = ["ExpiredOtpTokens.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:otp_token",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
