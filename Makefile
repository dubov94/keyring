default: build-reverse-proxy build-pwa build-grpc-gateway build-server build-ip-geolocation

clean:
	docker system prune --all --force

build-reverse-proxy:
	bazel run -c opt //:reverse_proxy

build-pwa:
	bazel run -c opt //pwa

build-grpc-gateway:
	bazel run -c opt //grpc_gateway

build-server:
	bazel run -c opt //server

build-ip-geolocation:
	bazel run -c opt //ip_geolocation
