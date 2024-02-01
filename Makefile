gen:
	protoc --go_out=./pkg/stream-bench/ \
		   --go_opt=paths=source_relative \
		   --go-grpc_out=./pkg/stream-bench/ \
		   --go-grpc_opt=paths=source_relative,require_unimplemented_servers=false \
		   --experimental_allow_proto3_optional \
		   proto/stream-bench.proto

