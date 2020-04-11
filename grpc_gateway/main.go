package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"

	"github.com/golang/glog"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"google.golang.org/grpc"

	gw "github.com/dubov94/keyring/grpc-gateway/service_gateway_library"
)

var (
	port          = flag.Int("port", 5002, "Port to bind to.")
	serverAddress = flag.String("server-address", "localhost:5001", "Server address.")
)

func startProxy() error {
	var err error

	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithInsecure()}

	err = gw.RegisterAuthenticationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return err
	}

	err = gw.RegisterAdministrationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return err
	}

	return http.ListenAndServe(fmt.Sprintf(":%d", *port), mux)
}

func main() {
	var err error

	flag.Parse()
	defer glog.Flush()

	err = startProxy()
	if err != nil {
		glog.Fatal(err)
	}
}
