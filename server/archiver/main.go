package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"time"

	"cloud.google.com/go/storage"
	"github.com/golang/glog"
	"google.golang.org/api/option"
)

var (
	host = flag.String("host", "localhost", "PostgreSQL host address.")
	databaseName = flag.String("database-name", "", "Name of the database to archive.")
	jsonCredsPath = flag.String("json-creds-path", "", "Path to the file with credentials.")
	bucketName = flag.String("bucket-name", "", "Name of the bucket with archives.")
)

func writeArchive(ctx context.Context) (fileName string, err error) {
	// As `dir` is an empty string, `CreateTemp` will use the
	// default directory.
	file, err := os.CreateTemp("", "*")
	if err != nil {
		return "", fmt.Errorf("unable to create a location for the archive: %w", err)
	}
	fileName = file.Name()
	defer func() {
		if dErr := file.Close(); dErr != nil && err == nil {
			err = fmt.Errorf("unable to close the temporary file at %s: %w", fileName, dErr)
		}
	}()

	// Expects `PGPASSWORD` to be set, see
	// https://www.postgresql.org/docs/current/libpq-envars.html.
	cmd := exec.CommandContext(
		ctx,
		"pg_dump",
		"--host",
		*host,
		"--username",
		"postgres",
		*databaseName,
	)
	cmd.Stdout = file
	cmd.Stderr = os.Stderr
	err = cmd.Run()
	if err != nil {
		return "", fmt.Errorf("unable to dump database '%s': %w", *databaseName, err)
	}

	return fileName, nil
}

func storeArchive(ctx context.Context) (objectName string, err error) {
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(*jsonCredsPath))
	if err != nil {
		return "", fmt.Errorf("unable to create a Cloud Storage client: %w", err)
	}
	bucket := client.Bucket(*bucketName)

	archivePath, err := writeArchive(ctx)
	if err != nil {
		return "", fmt.Errorf("unable to write the archive to the disk: %w", err)
	}

	objectName = time.Now().UTC().Format(time.RFC3339)
	object := bucket.Object(objectName)
	writer := object.NewWriter(ctx)
	defer func() {
		if dErr := writer.Close(); dErr != nil && err == nil {
			err = fmt.Errorf("unable to close the writer for '%s': %w", objectName, dErr)
		}
	}()

	archiveReader, err := os.Open(archivePath)
	if err != nil {
		return "", fmt.Errorf("unable to open the archive at %s: %w", archivePath, err)
	}
	defer func() {
		if dErr := archiveReader.Close(); dErr != nil && err == nil {
			err = fmt.Errorf("unable to close the archive at %s: %w", archivePath, dErr)
		}
	}()
	_, err = io.Copy(writer, archiveReader)
	if err != nil {
		return "", fmt.Errorf("unable to copy the archive from %s to '%s': %w", archivePath, objectName, err)
	}

	return objectName, nil
}

func main() {
	var err error

	flag.Parse()
	defer glog.Flush()
	ctx := context.Background()

	objectName, err := storeArchive(ctx)
	if err != nil {
		glog.Fatal(err)
	}
	glog.Infof("The archive has been stored in the bucket as '%s'", objectName)
}
