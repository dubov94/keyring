default: build-client build-gateway build-health build-server

clean:
	docker system prune --all --force

build-client:
	docker build -f client/Dockerfile -t dubov94/keyring-client --build-arg GIT_REVISION="$(shell git describe --always)" .

build-gateway:
	docker build -f gateway/Dockerfile -t dubov94/keyring-gateway .

build-health:
	docker build -f health/Dockerfile -t dubov94/keyring-health .

build-server:
	docker build -f server/Dockerfile -t dubov94/keyring-server .

