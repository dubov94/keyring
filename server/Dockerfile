from maven

workdir /root/keyring/server

copy ./server .
run mvn compile

expose 591
cmd ["./entrypoint.sh"]
