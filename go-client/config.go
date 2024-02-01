package main

import (
	"crypto/tls"
	"math"
	"time"

	"github.com/creasty/defaults"
	grpc_retry "github.com/grpc-ecosystem/go-grpc-middleware/retry"
	"github.com/pkg/errors"
	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

type GRPCConfig struct {
	Insecure             bool          `default:"true"`
	MinConnectionTimeout time.Duration `default:"5s"`
	MaxRetries           uint          `default:"3"`

	// ConfigManagerCommonEndpoint string `default:"localhost:8080"`
	ConfigManagerCommonEndpoint string `default:"grpc-stream-bench.sb-micro:8080"`
}

func GetGRPCConfig() (GRPCConfig, error) {
	cfg := GRPCConfig{}
	if err := defaults.Set(&cfg); err != nil {
		err = errors.Wrap(err, "set default values")
		return GRPCConfig{}, err
	}

	return cfg, nil
}

func (cfg GRPCConfig) DialOptions() []grpc.DialOption {
	connParams := grpc.ConnectParams{
		Backoff:           backoff.DefaultConfig,
		MinConnectTimeout: cfg.MinConnectionTimeout,
	}

	retryInterceptor := grpc_retry.UnaryClientInterceptor(
		grpc_retry.WithMax(cfg.MaxRetries),
	)

	kacp := keepalive.ClientParameters{
		Time:                15 * time.Second,
		Timeout:             time.Second,
		PermitWithoutStream: true,
	}

	var cred credentials.TransportCredentials
	if cfg.Insecure {
		cred = insecure.NewCredentials()
	} else {
		cred = credentials.NewTLS(&tls.Config{})
	}

	opts := []grpc.DialOption{
		grpc.WithConnectParams(connParams),
		grpc.WithUnaryInterceptor(retryInterceptor),
		grpc.WithKeepaliveParams(kacp),
		grpc.WithTransportCredentials(cred),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(math.MaxInt64)),
		grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
	}

	return opts
}
