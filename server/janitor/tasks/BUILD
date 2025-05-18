load("//server:aspectj.bzl", "woven_junit5_test")
load("//server/janitor:aspectj.bzl", "ASPECTS")

package(default_visibility = ["//server:internal"])

java_library(
    name = "deleted_user_eviction",
    srcs = ["DeletedUserEviction.java"],
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
    name = "deleted_user_eviction_test",
    srcs = ["DeletedUserEvictionTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":deleted_user_eviction",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:user",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
    ],
)

java_library(
    name = "initiated_session_expiration",
    srcs = ["InitiatedSessionExpiration.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "//server/main/messagebroker:message_broker_client",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "initiated_session_expiration_test",
    srcs = ["InitiatedSessionExpirationTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":initiated_session_expiration",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "//server/main/messagebroker:message_broker_client",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
    ],
)

java_library(
    name = "activated_session_expiration",
    srcs = ["ActivatedSessionExpiration.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

woven_junit5_test(
    name = "activated_session_expiration_test",
    srcs = ["ActivatedSessionExpirationTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":activated_session_expiration",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:session",
        "//server/main/entities:user",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
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
    name = "pending_user_expiration",
    srcs = ["PendingUserExpiration.java"],
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
    name = "pending_user_expiration_test",
    srcs = ["PendingUserExpirationTest.java"],
    aop_xml = "//server/janitor/java/META-INF:aop.xml",
    aspects = ASPECTS,
    resources = ["//server/java/META-INF:persistence.xml"],
    test_package = "keyring.server.janitor.tasks",
    runtime_deps = [
        "@maven//:org_postgresql_postgresql",
    ],
    deps = [
        ":pending_user_expiration",
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/aspects:storage_manager_aspect",
        "//server/main/entities:columns_java_proto",
        "//server/main/entities:key",
        "//server/main/entities:user",
        "@maven//:com_fasterxml_jackson_core_jackson_databind",
        "@maven//:com_google_guava_guava",
        "@maven//:javax_persistence_javax_persistence_api",
        "@maven//:name_falgout_jeffrey_testing_junit5_mockito_extension",
        "@maven//:org_aspectj_aspectjrt",
        "@maven//:org_mockito_mockito_core",
        "@maven//:org_testcontainers_junit_jupiter",
        "@maven//:org_testcontainers_postgresql",
        "@maven//:org_testcontainers_testcontainers",
    ],
)

java_library(
    name = "session_record_eviction",
    srcs = ["SessionRecordEviction.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:session",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "otp_params_eviction",
    srcs = ["OtpParamsEviction.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:otp_params",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)

java_library(
    name = "otp_token_eviction",
    srcs = ["OtpTokenEviction.java"],
    deps = [
        "//server/main:chronometry",
        "//server/main/aspects:annotations",
        "//server/main/entities:otp_token",
        "@maven//:javax_inject_javax_inject",
        "@maven//:javax_persistence_javax_persistence_api",
    ],
)
