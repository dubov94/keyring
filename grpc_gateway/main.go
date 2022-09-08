package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang/glog"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/encoding/protojson"

	gw "github.com/dubov94/keyring/grpc_gateway/service_gateway_library"
)

var (
	port          = flag.Int("port", 5002, "Port to bind to.")
	serverAddress = flag.String("server-address", "localhost:5001", "Server address.")
)

func annotator(ctx context.Context, req *http.Request) metadata.MD {
	return metadata.Pairs(
		"x-ip-address", strings.Split(req.Header.Get("x-forwarded-for"), ", ")[0],
		"x-user-agent", req.Header.Get("user-agent"),
	)
}

func headerMatcher(key string) (string, bool) {
	switch key {
	case "X-Client-Version":
		return key, true
	case "X-Session-Token":
		return key, true
	default:
		return runtime.DefaultHeaderMatcher(key)
	}
}

func startProxy() (err error) {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux(
		runtime.WithMarshalerOption(
			runtime.MIMEWildcard, &runtime.JSONPb{
				MarshalOptions: protojson.MarshalOptions{
					UseProtoNames: true,
					EmitUnpopulated: true,
				},
			},
		),
		runtime.WithIncomingHeaderMatcher(headerMatcher),
		runtime.WithMetadata(annotator),
	)
	opts := []grpc.DialOption{grpc.WithInsecure()}

	err = gw.RegisterAuthenticationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return fmt.Errorf("unable to register `Authentication` endpoints: %w", err)
	}

	err = gw.RegisterAdministrationHandlerFromEndpoint(ctx, mux, *serverAddress, opts)
	if err != nil {
		return fmt.Errorf("unable to register `Administration` endpoints: %w", err)
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
