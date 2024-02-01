package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

func main() {
	term := sigterm()

	cfg, err := GetGRPCConfig()
	if err != nil {
		logrus.Fatal(err)
	}

	cmClient, err := NewSBClient(cfg)
	if err != nil {
		logrus.Fatal(err)
	}
	watchers, err := strconv.Atoi(os.Getenv("WATCHERS"))
	if err != nil {
		watchers = 100
	}
	folder := os.Getenv("FOLDER")
	if folder == "" {
		folder = "small"
	}
	sep, err := strconv.ParseBool(os.Getenv("SEPARATED"))
	if err != nil {
		sep = false
	}
	fmt.Println("total watchers", watchers)
	fmt.Println("folder", folder)
	fmt.Println("separated", sep)
	g, ctx := errgroup.WithContext(context.Background())

	for i := 0; i < watchers; i++ {
		id := i
		if sep {
			g.Go(func() error { return cmClient.WatchSep(ctx, folder, id) })
		} else {
			g.Go(func() error { return cmClient.Watch(ctx, folder, id) })
		}
	}

	select {
	case <-term:
	case <-ctx.Done():
	}
	e := g.Wait()
	// fmt.Println(ctx.Err().Error())

	if e != nil {
		logrus.Infoln(fmt.Sprintf("error from goroutine: %v\n", e))
	}

	logrus.Infoln("terminated")
	os.Exit(0)
}

func sigterm() <-chan struct{} {
	term := make(chan struct{})
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop
		logrus.Infoln("interrupt signal has been caught")
		close(term)
	}()
	return term
}
