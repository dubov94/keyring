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

http_archive(
    name = "rules_java",
    sha256 = "ccf00372878d141f7d5568cedc4c42ad4811ba367ea3e26bc7c43445bbc52895",
    strip_prefix = "rules_java-d7bf804c8731edd232cb061cb2a9fe003a85d8ee",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_java/archive/d7bf804c8731edd232cb061cb2a9fe003a85d8ee.tar.gz",
        "https://github.com/bazelbuild/rules_java/archive/d7bf804c8731edd232cb061cb2a9fe003a85d8ee.tar.gz",
    ],
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    artifacts = [
        "com.google.code.gson:gson:2.8.2",
        "com.google.dagger:dagger:2.14.1",
        "com.google.guava:guava:24.0-jre",
        "com.google.http-client:google-http-client:1.31.0",
        "com.google.http-client:google-http-client-gson:1.31.0",
        "io.grpc:grpc-netty:1.8.0",
        "io.grpc:grpc-protobuf:1.8.0",
        "io.grpc:grpc-stub:1.8.0",
        "org.hibernate:hibernate-core:5.2.12.Final",
        "org.jtwig:jtwig-core:5.86.1.RELEASE",
        "redis.clients:jedis:2.9.0",
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

load("@rules_java//java:repositories.bzl", "rules_java_dependencies", "rules_java_toolchains")

rules_java_dependencies()

rules_java_toolchains()
