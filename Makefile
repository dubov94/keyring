default: build-client build-proto-bridge build-monitoring build-server

clean:
	docker system prune --all --force

build-client:
	docker build -f client/Dockerfile -t dubov94/keyring-client --build-arg GIT_REVISION="$(shell git describe --always)" .

build-monitoring:
	docker build -f monitoring/Dockerfile -t dubov94/keyring-monitoring .

build-proto-bridge:
	docker build -f proto_bridge/Dockerfile -t dubov94/keyring-proto-bridge .

build-server:
	docker build -f server/Dockerfile -t dubov94/keyring-server .

build-ip-geolocation:
	docker build -f ip_geolocation/Dockerfile -t dubov94/keyring-ip-geolocation .

