gen:
	protoc --go_out=../pkg/config-manager/ \
		   --go_opt=paths=source_relative \
		   --go-grpc_out=../pkg/config-manager/ \
		   --go-grpc_opt=paths=source_relative,require_unimplemented_servers=false \
		   --experimental_allow_proto3_optional \
		   config-manager-common.proto

	protoc --go_out=../pkg/config-manager/ \
		   --go_opt=paths=source_relative \
		   --go-grpc_out=../pkg/config-manager/ \
		   --experimental_allow_proto3_optional \
		   --go-grpc_opt=paths=source_relative,require_unimplemented_servers=false \
		   config-manager-internal.proto

	protoc --go_out=../pkg/config-manager/ \
		   --go_opt=paths=source_relative \
		   --go-grpc_out=../pkg/config-manager/ \
		   --experimental_allow_proto3_optional \
		   --go-grpc_opt=paths=source_relative,require_unimplemented_servers=false \
		   config-manager-metadata.proto
