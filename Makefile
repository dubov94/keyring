default: build-client build-monitoring build-proto-bridge build-server build-ip-geolocation

clean:
	docker system prune --all --force

build-client:
	docker build -f client/Dockerfile -t dubov94/keyring-client --build-arg GIT_REVISION="$(shell git describe --always)" .

build-monitoring:
	docker build -f monitoring/Dockerfile -t dubov94/keyring-monitoring .

build-proto-bridge:
	docker build -f proto_bridge/Dockerfile -t dubov94/keyring-proto-bridge .

build-server:
	bazel run //server

build-ip-geolocation:
	docker build -f ip_geolocation/Dockerfile -t dubov94/keyring-ip-geolocation .
