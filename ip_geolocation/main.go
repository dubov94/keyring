package main

import (
	"context"
	"flag"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path"
	"time"

	"github.com/golang/glog"
	"google.golang.org/grpc"
	"golang.org/x/sync/errgroup"

	gi "github.com/dubov94/keyring/proto/geo_ip_go_grpc"
	mmdb "github.com/oschwald/maxminddb-golang"
)

var (
	port = flag.Int("port", 5003, "Port to bind to.")

	entryShPath = "/usr/bin/entry.sh"
	// https://github.com/maxmind/geoipupdate/blob/master/docker/entry.sh
	dbPath = path.Join("/usr/share/GeoIP", "GeoLite2-City.mmdb")
)

// https://github.com/oschwald/geoip2-golang/blob/main/reader.go
type record struct {
	City struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"city"`
	Country struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"country"`
}

type server struct {
	gi.UnimplementedGeoIpServiceServer
}

func (s *server) GetIpInfo(ctx context.Context, in *gi.GetIpInfoRequest) (*gi.GetIpInfoResponse, error) {
	reader, err := mmdb.Open(dbPath)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	var r record
	err = reader.Lookup(net.ParseIP(in.GetIpAddress()), &r)
	if err != nil {
		return nil, err
	}

	return &gi.GetIpInfoResponse{
		Country: &gi.Country{
			Names: &gi.Names{
				En: r.Country.Names["en"],
			},
		},
		City: &gi.City{
			Names: &gi.Names{
				En: r.City.Names["en"],
			},
		},
	}, nil
}

func updateDb() error {
	// Expects GEOIPUPDATE_ACCOUNT_ID, GEOIPUPDATE_LICENSE_KEY and GEOIPUPDATE_EDITION_IDS.
	cmd := exec.Command(entryShPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func main() {
	defer glog.Flush()

	if err := updateDb(); err != nil {
		glog.Fatalf("Unable to update the database: %v", err)
	}

	group, gCtx := errgroup.WithContext(context.Background())

	group.Go(func() error {
		ticker := time.NewTicker(24 * time.Hour)
		for {
			select {
			case <-ticker.C:
				if err := updateDb(); err != nil {
					return fmt.Errorf("Unable to update the database: %v", err)
				}
			case <-gCtx.Done():
				return nil
			}
		}
	})

	group.Go(func() error {
		ln, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
		if err != nil {
			return fmt.Errorf("Unable to listen: %v", err)
		}
	
		s := grpc.NewServer()
		gi.RegisterGeoIpServiceServer(s, &server{})
	
		if err = s.Serve(ln); err != nil {
			return fmt.Errorf("Unable to serve: %v", err)
		}

		return nil
	})

	if err := group.Wait(); err != nil {
		glog.Fatal(err)
	}
}
