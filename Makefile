default: build-client build-gateway build-monitoring build-server

clean:
	docker system prune --all --force

build-client:
	docker build -f client/Dockerfile -t dubov94/keyring-client --build-arg GIT_REVISION="$(shell git describe --always)" .

build-gateway:
	docker build -f gateway/Dockerfile -t dubov94/keyring-gateway .

build-monitoring:
	docker build -f monitoring/Dockerfile -t dubov94/keyring-monitoring .

build-server:
	docker build -f server/Dockerfile -t dubov94/keyring-server .

