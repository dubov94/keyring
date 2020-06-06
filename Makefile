default: build-pwa build-grpc-gateway build-server build-ip-geolocation

clean:
	docker system prune --all --force

build-pwa:
	bazel run //pwa

build-grpc-gateway:
	bazel run //grpc_gateway

build-server:
	bazel run //server

build-ip-geolocation:
	bazel run //ip_geolocation
