load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "rules_jvm_external",
    sha256 = "82262ff4223c5fda6fb7ff8bd63db8131b51b413d26eb49e3131037e79e324af",
    strip_prefix = "rules_jvm_external-3.2",
    url = "https://github.com/bazelbuild/rules_jvm_external/archive/3.2.zip",
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
    name = "rules_proto_grpc",
    sha256 = "5f0f2fc0199810c65a2de148a52ba0aff14d631d4e8202f41aff6a9d590a471b",
    strip_prefix = "rules_proto_grpc-1.0.2",
    urls = ["https://github.com/rules-proto-grpc/rules_proto_grpc/archive/1.0.2.tar.gz"],
)

http_archive(
    name = "rules_pkg",
    sha256 = "4ba8f4ab0ff85f2484287ab06c0d871dcb31cc54d439457d28fd4ae14b18450a",
    urls = ["https://github.com/bazelbuild/rules_pkg/releases/download/0.2.4/rules_pkg-0.2.4.tar.gz"],
)

http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "dc97fccceacd4c6be14e800b2a00693d5e8d07f69ee187babfd04a80a9f8e250",
    strip_prefix = "rules_docker-0.14.1",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.14.1/rules_docker-v0.14.1.tar.gz"],
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    artifacts = [
        "com.google.code.gson:gson:2.8.2",
        "com.google.dagger:dagger:2.14.1",
        "com.google.dagger:dagger-compiler:2.14.1",
        "com.google.guava:guava:24.0-jre",
        "com.google.http-client:google-http-client:1.31.0",
        "com.google.http-client:google-http-client-gson:1.31.0",
        "io.grpc:grpc-netty-shaded:1.28.0",
        "io.grpc:grpc-protobuf:1.28.0",
        "io.grpc:grpc-stub:1.28.0",
        "javax.activation:activation:1.1.1",
        "javax.annotation:javax.annotation-api:1.3.2",
        "javax.xml.bind:jaxb-api:2.3.0",
        "net.sargue:mailgun:1.5.0",
        "org.aspectj:aspectjrt:1.8.13",
        "org.aspectj:aspectjweaver:1.8.13",
        "org.hibernate:hibernate-c3p0:5.2.18.Final",
        "org.hibernate:hibernate-core:5.2.18.Final",
        "org.hibernate:hibernate-jpamodelgen:5.2.18.Final",
        "org.jtwig:jtwig-core:5.86.1.RELEASE",
        "org.postgresql:postgresql:42.1.4",
        "org.slf4j:slf4j-simple:1.7.25",
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
        "com.github.kstyrc:embedded-redis:0.6",
        "com.h2database:h2:1.4.197",
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

load("@rules_proto_grpc//:repositories.bzl", "rules_proto_grpc_repos", "rules_proto_grpc_toolchains")

rules_proto_grpc_toolchains()

rules_proto_grpc_repos()

load("@rules_proto_grpc//java:repositories.bzl", rules_proto_grpc_java_repos = "java_repos")

rules_proto_grpc_java_repos()

load("@io_grpc_grpc_java//:repositories.bzl", "grpc_java_repositories")

grpc_java_repositories(
    omit_bazel_skylib = True,
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_javalite = True,
    omit_net_zlib = True,
)

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")

rules_pkg_dependencies()

load("@io_bazel_rules_docker//repositories:repositories.bzl", container_repositories = "repositories")

container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")

container_deps()

load("@io_bazel_rules_docker//container:container.bzl", "container_pull")

container_pull(
    name = "io_docker_index_library_openjdk",
    digest = "sha256:85d0cc6be1b6eaa6507c910fcd675a17912d04da8bd718e0e6bab42865229e4f",
    registry = "index.docker.io",
    repository = "library/openjdk",
    tag = "9-jre",
)
