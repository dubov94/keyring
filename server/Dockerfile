from maven:3-jdk-8

workdir /root/keyring/server

copy ./server ./
run mvn compile

env MODULE_STATE="production"
expose 591
cmd ["./entrypoint.sh"]
