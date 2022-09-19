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
	host = flag.String("host", "localhost", "PostgreSQL host address.")
	databaseName = flag.String("database-name", "", "Name of the database to archive.")
	jsonCredsPath = flag.String("json-creds-path", "", "Path to the file with credentials.")
	bucketName = flag.String("bucket-name", "", "Name of the bucket with archives.")
	objectName = flag.String("object-name", "", "Name of the archive object.")
)

func restoreArchive(ctx context.Context, reader io.Reader) error {
	// Expects `PGPASSWORD` to be set, see
	// https://www.postgresql.org/docs/current/libpq-envars.html.
	cmd := exec.CommandContext(
		ctx,
		"pg_restore",
		"--host",
		*host,
		"--username",
		"postgres",
		"--dbname",
		*databaseName,
		"--exit-on-error",
	)
	cmd.Stdin = reader
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("unable to restore database '%s': %w", *databaseName, err)
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
