default: build-pwa build-grpc-gateway build-server build-ip-geolocation

clean:
	docker system prune --all --force

build-pwa:
	bazel run -c opt //pwa

build-grpc-gateway:
	bazel run -c opt //grpc_gateway

build-server:
	bazel run -c opt //server

build-ip-geolocation:
	bazel run -c opt //ip_geolocation
