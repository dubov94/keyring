while true
do
  date
  curl --location pwd.floreina.me/api/authentication/get-salt/anonymous
  echo
  sleep 60
done
