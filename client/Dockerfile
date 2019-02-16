from node:10

arg GIT_REVISION
env GIT_REVISION ${GIT_REVISION}

workdir /root/keyring/client

run curl https://getcaddy.com | bash -s personal

copy ./client/package*.json ./
run npm install

copy ./client ./
run npm run build

expose 80
cmd ["caddy"]
