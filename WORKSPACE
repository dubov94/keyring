load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

RULES_JVM_EXTERNAL_TAG = "3.0"

RULES_JVM_EXTERNAL_SHA = "62133c125bf4109dfd9d2af64830208356ce4ef8b165a6ef15bbff7460b35c3a"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/%s.zip" % RULES_JVM_EXTERNAL_TAG,
)

http_archive(
    name = "rules_proto",
    sha256 = "602e7161d9195e50246177e7c55b2f39950a9cf7366f74ed5f22fd45750cd208",
    strip_prefix = "rules_proto-97d8af4dc474595af3900dd85cb3a29ad28cc313",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
        "https://github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
    ],
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    artifacts = [
        "com.google.guava:guava:24.0-jre",
        "org.jtwig:jtwig-core:5.86.1.RELEASE",
    ] + [
        "org.apiguardian:apiguardian-api:1.0.0",
        "org.junit.jupiter:junit-jupiter-api:5.5.0",
        "org.junit.jupiter:junit-jupiter-engine:5.5.0",
        "org.junit.jupiter:junit-jupiter-params:5.5.0",
        "org.junit.platform:junit-platform-commons:1.5.0",
        "org.junit.platform:junit-platform-console:1.5.0",
        "org.junit.platform:junit-platform-engine:1.5.0",
        "org.junit.platform:junit-platform-launcher:1.5.0",
        "org.junit.platform:junit-platform-suite-api:1.5.0",
        "org.opentest4j:opentest4j:1.1.1",
    ] + [
        "name.falgout.jeffrey.testing.junit5:mockito-extension:1.0.0",
        "org.mockito:mockito-core:2.15.0",
    ],
    repositories = [
        "https://jcenter.bintray.com/",
    ],
)

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")

rules_proto_dependencies()

rules_proto_toolchains()
