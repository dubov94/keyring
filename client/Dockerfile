from node

workdir /root/keyring/client

run npm install --global http-server

copy ./client/package*.json ./
run npm install

copy ./client ./
run npm run build

expose 80
cmd ["http-server", "-p", "80", "./dist"]
