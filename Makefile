default: build-client build-proto-bridge build-server build-ip-geolocation

clean:
	docker system prune --all --force

build-client:
	docker build -f client/Dockerfile -t dubov94/keyring-client --build-arg GIT_REVISION="$(shell git describe --always)" .

build-proto-bridge:
	bazel run //proto_bridge

build-server:
	bazel run //server

build-ip-geolocation:
	docker build -f ip_geolocation/Dockerfile -t dubov94/keyring-ip-geolocation .
