from node

workdir /root/keyring/client

run npm install --global http-server

copy ./client/package*.json ./
run npm install

copy ./client ./
run npm run build

run ln -s index.html ./dist/404.html

expose 80
cmd ["http-server", "-p", "80", "./dist"]
