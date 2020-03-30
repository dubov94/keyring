package main

import (
	"context"
	"flag"
	"net/http"

	"github.com/golang/glog"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"google.golang.org/grpc"

	gw "github.com/dubov94/keyring/proto-bridge/keyring_gateway_library"
)

var (
	serverAddress = flag.String("server-address", "localhost:591", "Server address.")
)

func startProxy() error {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithInsecure()}

	err := gw.RegisterAuthenticationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return err
	}

	err = gw.RegisterAdministrationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return err
	}

	return http.ListenAndServe(":80", mux)
}

func main() {
	flag.Parse()
	defer glog.Flush()

	if err := startProxy(); err != nil {
		glog.Fatal(err)
	}
}
