from node:10

workdir /root/keyring/proto_bridge

copy ./proto_bridge/package*.json ./
run npm install

copy ./proto_bridge ./

copy ./server/src/main/proto/keyring.proto ./
copy ./server/src/main/proto/mapping.json ./

expose 80
cmd ["node", "index.js", "keyring.proto", "mapping.json"]
