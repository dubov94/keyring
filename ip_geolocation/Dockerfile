from ubuntu

run apt-get update
run apt-get install -y software-properties-common

run add-apt-repository ppa:maxmind/ppa
run apt-get update

run apt-get install -y geoipupdate
copy ./ip_geolocation/GeoIP.conf /etc/GeoIP.conf
env MMDB_PATH=/usr/share/GeoIP

run apt-get install -y python3 python3-pip
run pip3 install bottle maxminddb

workdir /root/keyring/ip_geolocation

copy ./ip_geolocation ./

expose 5003
cmd ["python3", "main.py"]

