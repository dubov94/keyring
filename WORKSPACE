workspace(
    name = "keyring",
    managed_directories = {
        "@pwa_npm": ["pwa/node_modules"],
        "@redirection_npm": ["redirection/node_modules"],
    },
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

# skylib_dependencies

http_archive(
    name = "bazel_skylib",
    sha256 = "97e70364e9249702246c0e9444bccdc4b847bed1eb03c5a3ece4f83dfe6abc44",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.0.2/bazel-skylib-1.0.2.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.0.2/bazel-skylib-1.0.2.tar.gz",
    ],
)

load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

# external_proto_dependencies

http_archive(
    name = "rules_proto",
    sha256 = "66bfdf8782796239d3875d37e7de19b1d94301e8972b3cbd2446b332429b4df1",
    strip_prefix = "rules_proto-4.0.0",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_proto/archive/refs/tags/4.0.0.tar.gz",
        "https://github.com/bazelbuild/rules_proto/archive/refs/tags/4.0.0.tar.gz",
    ],
)

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")

rules_proto_dependencies()

rules_proto_toolchains()

# external_proto_dependencies.rules_proto_grpc_dependencies

http_archive(
    name = "rules_proto_grpc",
    sha256 = "7954abbb6898830cd10ac9714fbcacf092299fda00ed2baf781172f545120419",
    strip_prefix = "rules_proto_grpc-3.1.1",
    urls = ["https://github.com/rules-proto-grpc/rules_proto_grpc/archive/3.1.1.tar.gz"],
)

load("@rules_proto_grpc//:repositories.bzl", "rules_proto_grpc_repos", "rules_proto_grpc_toolchains")

rules_proto_grpc_toolchains()

rules_proto_grpc_repos()

# external_proto_dependencies.rules_openapi_dependencies

RULES_OPEN_API_VERSION = "896323d32a19078e83a70513077554a6529b18b7"

RULES_OPEN_API_SHA256 = "dca86aea8e76ae891bedf42dbb91a7d4b573efc7142cb6049d6b061768c43701"

http_archive(
    name = "io_bazel_rules_openapi",
    sha256 = RULES_OPEN_API_SHA256,
    strip_prefix = "rules_openapi-{}".format(RULES_OPEN_API_VERSION),
    urls = ["https://github.com/meetup/rules_openapi/archive/{}.tar.gz".format(RULES_OPEN_API_VERSION)],
)

load("@io_bazel_rules_openapi//openapi:openapi.bzl", "openapi_repositories")

openapi_repositories()

# language_specific_dependencies

# language_specific_dependencies.external_java_dependencies

# language_specific_dependencies.external_java_dependencies.rules_proto_grpc_dependencies

load("@rules_proto_grpc//java:repositories.bzl", rules_proto_grpc_java_repos = "java_repos")

rules_proto_grpc_java_repos()

load("@io_grpc_grpc_java//:repositories.bzl", "grpc_java_repositories")

grpc_java_repositories()

# language_specific_dependencies.external_java_dependencies

http_archive(
    name = "rules_jvm_external",
    sha256 = "82262ff4223c5fda6fb7ff8bd63db8131b51b413d26eb49e3131037e79e324af",
    strip_prefix = "rules_jvm_external-3.2",
    urls = ["https://github.com/bazelbuild/rules_jvm_external/archive/3.2.zip"],
)

load("@io_grpc_grpc_java//:repositories.bzl", "IO_GRPC_GRPC_JAVA_ARTIFACTS", "IO_GRPC_GRPC_JAVA_OVERRIDE_TARGETS")
load("@rules_jvm_external//:defs.bzl", "maven_install")

ASPECTJ_VERSION = "1.9.5"

# Run `bazel run @unpinned_maven//:pin` to re-pin.
maven_install(
    artifacts = [
        "com.beust:jcommander:1.78",
        "com.google.auto.value:auto-value:1.10",
        "com.google.auto.value:auto-value-annotations:1.10",
        "com.google.dagger:dagger:2.14.1",
        "com.google.dagger:dagger-compiler:2.14.1",
        "com.google.guava:guava:24.0-jre",
        "com.google.http-client:google-http-client:1.42.3",
        "com.google.http-client:google-http-client-gson:1.42.3",
        "com.vladmihalcea:hibernate-types-52:2.11.1",
        "com.warrenstrange:googleauth:1.4.0",
        "commons-io:commons-io:2.11.0",
        "commons-validator:commons-validator:1.7",
        "io.grpc:grpc-netty-shaded:1.36.3",
        "io.grpc:grpc-protobuf:1.36.3",
        "io.grpc:grpc-stub:1.36.3",
        "io.vavr:vavr:0.10.3",
        "javax.activation:activation:1.1.1",
        "javax.annotation:javax.annotation-api:1.3.2",
        "javax.xml.bind:jaxb-api:2.3.0",
        "net.sargue:mailgun:1.10.0",
        "org.aspectj:aspectjrt:{}".format(ASPECTJ_VERSION),
        "org.aspectj:aspectjtools:{}".format(ASPECTJ_VERSION),
        "org.hibernate:hibernate-c3p0:5.4.19.Final",
        "org.hibernate:hibernate-core:5.4.19.Final",
        "org.hibernate:hibernate-jpamodelgen:5.4.19.Final",
        "org.jtwig:jtwig-core:5.86.1.RELEASE",
        "org.postgresql:postgresql:42.3.8",
        "org.slf4j:slf4j-simple:1.7.25",
        "redis.clients:jedis:4.2.3",
    ] + IO_GRPC_GRPC_JAVA_ARTIFACTS + [
        "org.apiguardian:apiguardian-api:1.0.0",
        "org.junit.jupiter:junit-jupiter-api:5.6.2",
        "org.junit.jupiter:junit-jupiter-engine:5.6.2",
        "org.junit.jupiter:junit-jupiter-params:5.6.2",
        "org.junit.platform:junit-platform-commons:1.5.0",
        "org.junit.platform:junit-platform-console:1.5.0",
        "org.junit.platform:junit-platform-engine:1.5.0",
        "org.junit.platform:junit-platform-launcher:1.5.0",
        "org.junit.platform:junit-platform-suite-api:1.5.0",
        "org.opentest4j:opentest4j:1.1.1",
    ] + [
        "name.falgout.jeffrey.testing.junit5:mockito-extension:1.0.0",
        "org.mockito:mockito-core:2.15.0",
        "org.testcontainers:junit-jupiter:1.15.3",
        "org.testcontainers:postgresql:1.15.3",
        "org.testcontainers:testcontainers:1.15.3",
    ],
    generate_compat_repositories = True,
    override_targets = IO_GRPC_GRPC_JAVA_OVERRIDE_TARGETS,
    repositories = [
        "https://repo1.maven.org/maven2",
    ],
    maven_install_json = "//:maven_install.json",
)

load("@maven//:defs.bzl", "pinned_maven_install")

pinned_maven_install()

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_jar")

# Separately to preserve `MANIFEST.MF`.
http_jar(
    name = "org_aspectj_aspectjweaver",
    url = "https://repo1.maven.org/maven2/org/aspectj/aspectjweaver/{version}/aspectjweaver-{version}.jar".format(version = ASPECTJ_VERSION),
    sha256 = "3ae596023e0789328fb6fbe404bf51746e21b524e58741e0f415be27c6f98aec",
)

load("@maven//:compat.bzl", maven_compat_repositories = "compat_repositories")

maven_compat_repositories()

# language_specific_dependencies.external_go_dependencies

# language_specific_dependencies.external_go_dependencies.rules_proto_grpc_dependencies

load("@rules_proto_grpc//:repositories.bzl", "bazel_gazelle", "io_bazel_rules_go")

io_bazel_rules_go()

load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")

go_rules_dependencies()

go_register_toolchains(
    version = "1.17.1",
)

bazel_gazelle()

load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")

gazelle_dependencies()

load("@rules_proto_grpc//grpc-gateway:repositories.bzl", rules_proto_grpc_gateway_repos = "gateway_repos")

rules_proto_grpc_gateway_repos()

load("@grpc_ecosystem_grpc_gateway//:repositories.bzl", "go_repositories")

go_repositories()

# language_specific_dependencies.external_go_dependencies

load("@bazel_gazelle//:deps.bzl", "go_repository")

go_repository(
    name = "com_github_oschwald_maxminddb_golang",
    importpath = "github.com/oschwald/maxminddb-golang",
    tag = "v1.8.0",
)

go_repository(
    name = "com_google_cloud_go_compute",
    importpath = "cloud.google.com/go/compute",
    sum = "h1:v/k9Eueb8aAJ0vZuxKMrgm6kPhCLZU9HxFU+AFDs9Uk=",
    version = "v1.7.0",
)

go_repository(
    name = "com_google_cloud_go_iam",
    importpath = "cloud.google.com/go/iam",
    sum = "h1:exkAomrVUuzx9kWFI1wm3KI0uoDeUFPB4kKGzx6x+Gc=",
    version = "v0.3.0",
)

go_repository(
    name = "com_google_cloud_go_storage",
    importpath = "cloud.google.com/go/storage",
    sum = "h1:S8N1cAStu7BOeFfE8KAQzmyyLkK8p/vmRq6kuBTW58Y=",
    version = "v1.22.1",
)

go_repository(
    name = "org_golang_google_api",
    importpath = "google.golang.org/api",
    sum = "h1:NTsGnUFJMYROtiquksZHBWtHfeMC7iYthki7Eq3pa8o=",
    version = "v0.84.0",
)

# language_specific_dependencies.external_node_dependencies

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "94070eff79305be05b7699207fbac5d2608054dd53e6109f7d00d923919ff45a",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.8.2/rules_nodejs-5.8.2.tar.gz"],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

node_repositories(
    node_version = "14.17.2",
    yarn_version = "1.22.4",
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "pwa_npm",
    package_json = "//pwa:package.json",
    yarn_lock = "//pwa:yarn.lock",
)

yarn_install(
    name = "redirection_npm",
    package_json = "//redirection:package.json",
    yarn_lock = "//redirection:yarn.lock",
)

# packaging_dependencies

# packaging_dependencies.external_pkg_dependencies

http_archive(
    name = "rules_pkg",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_pkg/releases/download/0.5.1/rules_pkg-0.5.1.tar.gz",
        "https://github.com/bazelbuild/rules_pkg/releases/download/0.5.1/rules_pkg-0.5.1.tar.gz",
    ],
    sha256 = "a89e203d3cf264e564fcb96b6e06dd70bc0557356eb48400ce4b5d97c2c3720d",
)

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")

rules_pkg_dependencies()

# packaging_dependencies.external_docker_dependencies

# packaging_dependencies.external_docker_dependencies.rules_docker_dependencies

http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "27d53c1d646fc9537a70427ad7b034734d08a9c38924cc6357cc973fed300820",
    strip_prefix = "rules_docker-0.24.0",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.24.0/rules_docker-v0.24.0.tar.gz"],
)

load("@io_bazel_rules_docker//repositories:repositories.bzl", container_repositories = "repositories")

container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")

container_deps()

# packaging_dependencies.external_docker_dependencies

load("@io_bazel_rules_docker//container:container.bzl", "container_pull")

container_pull(
    name = "io_docker_index_library_debian",
    digest = "sha256:121dd2a723be1c8aa8b116684d66157c93c801f2f5107b60287937e88c13ab89",
    registry = "index.docker.io",
    repository = "library/debian",
    tag = "10.3",
)

container_pull(
    name = "io_docker_index_library_nginx",
    digest = "sha256:3f13b4376446cf92b0cb9a5c46ba75d57c41f627c4edb8b635fa47386ea29e20",
    registry = "index.docker.io",
    repository = "library/nginx",
    tag = "1.21",
)

container_pull(
    name = "io_docker_index_library_openjdk",
    digest = "sha256:eaa06bc0541a17a55ac9040ccf8ce40655ef6e247534c21e4e065e1cf6078db2",
    registry = "index.docker.io",
    repository = "library/openjdk",
    tag = "9-jre",
)

container_pull(
    name = "io_docker_index_library_postgres",
    digest = "sha256:8d46fa657b46fb96a707b3dff90ff95014476874a96389f0370c1c2a2846f249",
    registry = "index.docker.io",
    repository = "library/postgres",
    tag = "14.5",
)

container_pull(
    name = "io_docker_index_liquibase_liquibase",
    digest = "sha256:e2537e2d44f05bf5a684f50b03e616dc9d4615bd7cf1cf58da7618e4193a99f2",
    registry = "index.docker.io",
    repository = "liquibase/liquibase",
    tag = "4.13",
)

container_pull(
    name = "io_docker_index_maxmindinc_geoipupdate",
    digest = "sha256:4803802f76c635839ab3d3fd4abb1c0d400c9788cffdd237e7c323298e40c915",
    registry = "index.docker.io",
    repository = "maxmindinc/geoipupdate",
    tag = "v4.3",
)

# multirun_dependencies.external_multirun_dependencies

git_repository(
    name = "com_github_atlassian_bazel_tools",
    commit = "936325de16966d259eee3f309f8578b761cfc874",
    remote = "https://github.com/atlassian/bazel-tools.git",
    shallow_since = "1586491416 +1000",
)

load("@com_github_atlassian_bazel_tools//multirun:deps.bzl", "multirun_dependencies")

multirun_dependencies()
