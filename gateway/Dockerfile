from node

workdir /root/keyring/gateway

copy ./gateway/package*.json ./
run npm install

copy ./gateway .

copy ./server/src/main/proto/keyring.proto ./
copy ./server/src/main/proto/mapping.json ./

expose 80
cmd ["node", "index.js", "keyring.proto", "mapping.json"]
