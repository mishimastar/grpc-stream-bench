import { Writer } from 'protobufjs';
import { SeparatedWatchResponse, StreamBenchService, WatchResponse } from '../proto/stream-bench';

// for cache with WatchResponce objects
export const Serialize2WR = (wr: WatchResponse): WatchResponse => wr;

// for cache with SeparatedWatchResponce objects
export const Serialize2SWR = (wr: WatchResponse): SeparatedWatchResponse[] => {
    const out: SeparatedWatchResponse[] = [];
    if (!wr.kv.length) return out;
    const parts = wr.kv.length;
    let part = 1;
    for (const kv of wr.kv) out.push({ kv, part: part++, parts });
    return out;
};

// for cache with Protobuf messages in Buffers
export const Serialize2Protobuf = (wr: WatchResponse): Buffer => StreamBenchService.watch.responseSerialize(wr);

// for cache with Protobuf messages in Buffers (watchSeparated responses)
export const Serialize2SepProtobuf = (wr: WatchResponse): Buffer[] =>
    Serialize2SWR(wr).map((swr) => StreamBenchService.watchSeparated.responseSerialize(swr));

// for cache with gRPC frames in Buffers
export const Serialize2gRPCFrame = (wr: WatchResponse): Buffer => {
    const ww = new Writer();
    ww.uint32(0).uint32(0).uint32(0).uint32(0).uint32(0);
    const out = Buffer.from(WatchResponse.encode(wr, ww).finish());
    out.writeUInt8(0, 0);
    out.writeUInt32BE(out.length - 5, 1);
    return out;
};

// for cache with gRPC frames in Buffers(watchSeparated responses)
export const Serialize2SepgRPCFrame = (wr: WatchResponse): Buffer[] =>
    Serialize2SWR(wr).map((swr) => {
        const ww = new Writer();
        ww.uint32(0).uint32(0).uint32(0).uint32(0).uint32(0);
        const out = Buffer.from(SeparatedWatchResponse.encode(swr, ww).finish());
        out.writeUInt8(0, 0);
        out.writeUInt32BE(out.length - 5, 1);
        return out;
    });
