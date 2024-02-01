/* eslint-disable */
import {
  ChannelCredentials,
  Client,
  ClientReadableStream,
  handleServerStreamingCall,
  makeGenericClientConstructor,
  Metadata,
} from "@grpc/grpc-js";
import type { CallOptions, ClientOptions, UntypedServiceImplementation } from "@grpc/grpc-js";
import _m0 from "protobufjs/minimal.js";

export interface KV {
  folder: string;
  key: string;
  value: Buffer;
}

export interface WatchRequest {
  folder: string;
}

export interface WatchResponse {
  kv: KV[];
}

export interface SeparatedWatchResponse {
  part: number;
  parts: number;
  kv: KV | undefined;
}

function createBaseKV(): KV {
  return { folder: "", key: "", value: Buffer.alloc(0) };
}

export const KV = {
  encode(message: KV, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.folder !== "") {
      writer.uint32(10).string(message.folder);
    }
    if (message.key !== "") {
      writer.uint32(18).string(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(34).bytes(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KV {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKV();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.folder = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.key = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.value = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): KV {
    return {
      folder: isSet(object.folder) ? globalThis.String(object.folder) : "",
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? Buffer.from(bytesFromBase64(object.value)) : Buffer.alloc(0),
    };
  },

  toJSON(message: KV): unknown {
    const obj: any = {};
    if (message.folder !== "") {
      obj.folder = message.folder;
    }
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value.length !== 0) {
      obj.value = base64FromBytes(message.value);
    }
    return obj;
  },
};

function createBaseWatchRequest(): WatchRequest {
  return { folder: "" };
}

export const WatchRequest = {
  encode(message: WatchRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.folder !== "") {
      writer.uint32(10).string(message.folder);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WatchRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWatchRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.folder = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): WatchRequest {
    return { folder: isSet(object.folder) ? globalThis.String(object.folder) : "" };
  },

  toJSON(message: WatchRequest): unknown {
    const obj: any = {};
    if (message.folder !== "") {
      obj.folder = message.folder;
    }
    return obj;
  },
};

function createBaseWatchResponse(): WatchResponse {
  return { kv: [] };
}

export const WatchResponse = {
  encode(message: WatchResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.kv) {
      KV.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WatchResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWatchResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.kv.push(KV.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): WatchResponse {
    return { kv: globalThis.Array.isArray(object?.kv) ? object.kv.map((e: any) => KV.fromJSON(e)) : [] };
  },

  toJSON(message: WatchResponse): unknown {
    const obj: any = {};
    if (message.kv?.length) {
      obj.kv = message.kv.map((e) => KV.toJSON(e));
    }
    return obj;
  },
};

function createBaseSeparatedWatchResponse(): SeparatedWatchResponse {
  return { part: 0, parts: 0, kv: undefined };
}

export const SeparatedWatchResponse = {
  encode(message: SeparatedWatchResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.part !== 0) {
      writer.uint32(8).uint32(message.part);
    }
    if (message.parts !== 0) {
      writer.uint32(16).uint32(message.parts);
    }
    if (message.kv !== undefined) {
      KV.encode(message.kv, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SeparatedWatchResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSeparatedWatchResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.part = reader.uint32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.parts = reader.uint32();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.kv = KV.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SeparatedWatchResponse {
    return {
      part: isSet(object.part) ? globalThis.Number(object.part) : 0,
      parts: isSet(object.parts) ? globalThis.Number(object.parts) : 0,
      kv: isSet(object.kv) ? KV.fromJSON(object.kv) : undefined,
    };
  },

  toJSON(message: SeparatedWatchResponse): unknown {
    const obj: any = {};
    if (message.part !== 0) {
      obj.part = Math.round(message.part);
    }
    if (message.parts !== 0) {
      obj.parts = Math.round(message.parts);
    }
    if (message.kv !== undefined) {
      obj.kv = KV.toJSON(message.kv);
    }
    return obj;
  },
};

export type StreamBenchService = typeof StreamBenchService;
export const StreamBenchService = {
  watch: {
    path: "/stream_bench.StreamBench/Watch",
    requestStream: false,
    responseStream: true,
    requestSerialize: (value: WatchRequest) => Buffer.from(WatchRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => WatchRequest.decode(value),
    responseSerialize: (value: WatchResponse) => Buffer.from(WatchResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => WatchResponse.decode(value),
  },
  watchSeparated: {
    path: "/stream_bench.StreamBench/WatchSeparated",
    requestStream: false,
    responseStream: true,
    requestSerialize: (value: WatchRequest) => Buffer.from(WatchRequest.encode(value).finish()),
    requestDeserialize: (value: Buffer) => WatchRequest.decode(value),
    responseSerialize: (value: SeparatedWatchResponse) => Buffer.from(SeparatedWatchResponse.encode(value).finish()),
    responseDeserialize: (value: Buffer) => SeparatedWatchResponse.decode(value),
  },
} as const;

export interface StreamBenchServer extends UntypedServiceImplementation {
  watch: handleServerStreamingCall<WatchRequest, WatchResponse>;
  watchSeparated: handleServerStreamingCall<WatchRequest, SeparatedWatchResponse>;
}

export interface StreamBenchClient extends Client {
  watch(request: WatchRequest, options?: Partial<CallOptions>): ClientReadableStream<WatchResponse>;
  watch(
    request: WatchRequest,
    metadata?: Metadata,
    options?: Partial<CallOptions>,
  ): ClientReadableStream<WatchResponse>;
  watchSeparated(request: WatchRequest, options?: Partial<CallOptions>): ClientReadableStream<SeparatedWatchResponse>;
  watchSeparated(
    request: WatchRequest,
    metadata?: Metadata,
    options?: Partial<CallOptions>,
  ): ClientReadableStream<SeparatedWatchResponse>;
}

export const StreamBenchClient = makeGenericClientConstructor(
  StreamBenchService,
  "stream_bench.StreamBench",
) as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): StreamBenchClient;
  service: typeof StreamBenchService;
  serviceName: string;
};

function bytesFromBase64(b64: string): Uint8Array {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
