package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"

	"cloud.google.com/go/storage"
	"github.com/golang/glog"
	"google.golang.org/api/option"
)

var (
	dbNamePath    = flag.String("pg-dbname-path", "", "Path to the file with `dbName`.")
	jsonCredsPath = flag.String("json-creds-path", "", "Path to the file with credentials.")
	bucketName    = flag.String("bucket-name", "", "Name of the bucket with archives.")
	objectName    = flag.String("object-name", "", "Name of the archive object.")
)

func restoreArchive(ctx context.Context, reader io.Reader) error {
	dbName, err := os.ReadFile(*dbNamePath)
	if err != nil {
		return fmt.Errorf("unable to read `dbName`: %w", err)
	}
	cmd := exec.CommandContext(
		ctx,
		"pg_restore",
		fmt.Sprintf("--dbname=%s", dbName),
		"--exit-on-error",
	)
	cmd.Stdin = reader
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err = cmd.Run(); err != nil {
		return fmt.Errorf("unable to restore the database: %w", err)
	}
	return nil
}

func applyArchive(ctx context.Context) (err error) {
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(*jsonCredsPath))
	if err != nil {
		return fmt.Errorf("unable to create a Cloud Storage client: %w", err)
	}
	bucket := client.Bucket(*bucketName)

	object := bucket.Object(*objectName)
	reader, err := object.NewReader(ctx)
	if err != nil {
		return fmt.Errorf("unable to create a reader for '%s': %w", *objectName, err)
	}
	defer func() {
		if dErr := reader.Close(); dErr != nil && err == nil {
			err = fmt.Errorf("unable to close the reader of '%s': %w", *objectName, dErr)
		}
	}()

	if err = restoreArchive(ctx, reader); err != nil {
		return fmt.Errorf("unable to apply the archive: %w", err)
	}
	return nil
}

func main() {
	flag.Parse()
	defer glog.Flush()
	ctx := context.Background()

	if err := applyArchive(ctx); err != nil {
		glog.Fatal(err)
	}
	glog.Infof("The archive '%s' has been successfully applied", *objectName)
}
