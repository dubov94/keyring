from alpine

run apk add curl

workdir /root/keyring/health

copy ./health/keepalive.sh ./

cmd ["./keepalive.sh"]
