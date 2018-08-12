# Convert secrets into environment variables.
for path in /run/secrets/*
do
  export `basename ${path^^}`="`cat $path`"
done

# Run the server.
mvn exec:exec
