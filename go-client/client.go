package main

import (
	"context"
	"fmt"

	"github.com/pkg/errors"
	"google.golang.org/grpc"

	gsb "github.com/mishimastar/grpc-stream-bench/pkg/stream-bench/proto"
)

type sbClient struct {
	client gsb.StreamBenchClient
}

type SBClient interface {
	Watch(ctx context.Context, folder string, id int) error
	WatchSep(ctx context.Context, folder string, id int) error
}

func NewSBClient(grpcCfg GRPCConfig) (SBClient, error) {
	opts := grpcCfg.DialOptions()
	cc, err := grpc.Dial(grpcCfg.StreamBenchCommonEndpoint, opts...)
	if err != nil {
		return nil, err
	}

	var cmClient SBClient = &sbClient{
		client: gsb.NewStreamBenchClient(cc),
	}

	return cmClient, nil
}

func (cmClient *sbClient) Watch(ctx context.Context, folder string, id int) error {
	rCp := &gsb.WatchRequest{Folder: folder}

	stream, err := cmClient.client.Watch(ctx, rCp)
	if err != nil {
		err = errors.Wrap(err, "start watch "+rCp.Folder)
		return err
	}
	defer stream.CloseSend()

	for {
		response, err := stream.Recv()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				err = errors.Wrap(err, "receive message from stream "+rCp.Folder)
				return err
			}
		}
		fmt.Println("received", id, len(response.Kv))

	}
}

func (cmClient *sbClient) WatchSep(ctx context.Context, folder string, id int) error {
	rCp := &gsb.WatchRequest{Folder: folder}

	stream, err := cmClient.client.WatchSeparated(ctx, rCp)
	if err != nil {
		err = errors.Wrap(err, "start watch "+rCp.Folder)
		return err
	}
	defer stream.CloseSend()

	for {
		response, err := stream.Recv()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				err = errors.Wrap(err, "receive message from stream "+rCp.Folder)
				return err
			}
		}
		fmt.Println("received sep", id, "part", response.Part, "of", response.Parts, "in folder", folder)

	}
}
