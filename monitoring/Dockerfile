from alpine

run apk add curl

workdir /root/keyring/monitoring

copy ./monitoring/keep_alive.sh ./

cmd ["./keep_alive.sh"]
