import { Server, ServerCredentials, ServerWritableStream } from '@grpc/grpc-js';

import {
    SeparatedWatchResponse,
    StreamBenchServer,
    StreamBenchService,
    WatchRequest,
    WatchResponse
} from './proto/stream-bench.js';
import { WatchInitialTime } from './metrics.js';
import { CacheTyped } from './cache/cache.js';
import { Serialize2Protobuf, Serialize2SepProtobuf } from './cache/serializers.js';
import { Status } from '@grpc/grpc-js/build/src/constants.js';

const server = new Server({
    'grpc.max_concurrent_streams': 1000,
    'grpc.max_receive_message_length': Infinity,
    'grpc.max_send_message_length': Infinity,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.keepalive_time_ms': 10000 // 10 seconds
});

// HACK START
type HackBuf<T> = {
    write(chunk: T): boolean;
    write(chunk: T | Buffer, encoding: 'buffer'): boolean;
    call?: { write: (frame: { meta: Buffer; payload: Buffer }) => void; serializeMessage: (r: T) => any };
};
export type HackedWritableBuf<T> = ServerWritableStream<WatchRequest, T> & HackBuf<T>;
export type HackedHttp2ServerCallStream = {
    checkCancelled(): boolean;
    maxSendMessageSize: number;
    sendError(a: any): void;
    emit(a: any): void;
    sendMetadata(): void;
    stream: { write(chunk: Buffer): boolean };
    handler: { serialize(a: any): Buffer };
};

(StreamBenchService.watch as any).responseSerialize = (value: WatchResponse) => {
    if (value instanceof Buffer) return value;
    return Buffer.from(WatchResponse.encode(value).finish());
};
(StreamBenchService.watchSeparated as any).responseSerialize = (value: SeparatedWatchResponse) => {
    if (value instanceof Buffer) return value;
    return Buffer.from(SeparatedWatchResponse.encode(value).finish());
};

export const getFakeWrite = (): ((frame: { meta: Buffer; payload: Buffer }) => void) => {
    return function (this: HackedHttp2ServerCallStream, frame: { meta: Buffer; payload: Buffer }) {
        if (this.checkCancelled()) {
            return;
        }
        if (this.maxSendMessageSize !== -1 && frame.payload.length > this.maxSendMessageSize) {
            this.sendError({
                code: Status.RESOURCE_EXHAUSTED,
                details: `Sent message larger than max (${frame.payload.length} vs. ${this.maxSendMessageSize})`
            });
            return;
        }
        this.sendMetadata();
        this.emit('sendMessage');
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const d1 = this.stream.write(frame.meta);
        // ignoring highWaterMark and drain event because for library user there must be only one write
        const d2 = this.stream.write(frame.payload);
        return d1 && d2;
    };
};

const createFakeSerializer = <T>(): ((r: T | Buffer) => { meta: Buffer; payload: Buffer }) => {
    return function (this: HackedHttp2ServerCallStream, r) {
        const messageBuffer = this.handler.serialize(r);
        const { byteLength } = messageBuffer;
        const output = Buffer.allocUnsafe(5);
        output.writeUInt8(0, 0);
        output.writeUInt32BE(byteLength, 1);
        return { meta: output, payload: messageBuffer };
    };
};
// HACK END

const Cache = new CacheTyped<Buffer>(Serialize2Protobuf);
const CacheSep = new CacheTyped<Buffer[]>(Serialize2SepProtobuf);

const getHandler = (call: ServerWritableStream<unknown, unknown>) => {
    return (arg: unknown) => {
        if (arg) console.log('data from event', arg);
        call.removeAllListeners();
        call.end();
    };
};

const addHandlers = (call: ServerWritableStream<unknown, unknown>) => {
    call.on('callEnd', getHandler(call));
    call.on('error', getHandler(call));
    call.on('finish', getHandler(call));
    call.on('close', getHandler(call));
};

const watch = async (call: HackedWritableBuf<WatchResponse>) => {
    const { folder } = call.request;
    const end = WatchInitialTime.startTimer({ folder });
    addHandlers(call);

    try {
        call.call!.serializeMessage = createFakeSerializer();
        call.call!.write = getFakeWrite();
        const resp = Cache.getResponse(folder);
        call.write(resp, 'buffer');
    } finally {
        end({ folder });
    }
};

const separatedWriter = async (msgs: Buffer[], call: HackedWritableBuf<SeparatedWatchResponse>) => {
    for (const msg of msgs) {
        if (call.write(msg, 'buffer')) continue;
        await new Promise<void>((res, rej) => {
            const d = () => {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                call.removeListener('error', e);
                res();
            };
            const e = (err: unknown) => {
                call.removeListener('drain', d);
                rej(err);
            };
            call.once('drain', d);
            call.once('error', e);
        });
    }
};

const watchSeparated = async (call: HackedWritableBuf<SeparatedWatchResponse>) => {
    const { folder } = call.request;
    const end = WatchInitialTime.startTimer({ folder });
    addHandlers(call);

    try {
        call.call!.serializeMessage = createFakeSerializer();
        call.call!.write = getFakeWrite();
        const resps = CacheSep.getResponse(folder);
        await separatedWriter(resps, call);
    } finally {
        end({ folder });
    }
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
const handlers: StreamBenchServer = { watch, watchSeparated };

export async function StartGRPC() {
    try {
        server.addService(StreamBenchService, handlers);
        await new Promise<void>((res, rej) =>
            server.bindAsync(`0.0.0.0:8080`, ServerCredentials.createInsecure(), (e) => (e ? rej(e) : res()))
        );
    } catch (error) {
        console.log('can`t bind server', { error });
        process.exit(1);
    }
    server.start();
    console.log('gRPC server listening on 0.0.0.0:8080');
}

export async function StopGRPC() {
    try {
        console.log('start shutdown');
        await new Promise<void>((reso, reje) => server.tryShutdown((e) => (e ? reje(e) : reso())));
        console.log('gRPC server finish shutdown');
    } catch (error) {
        console.error('gRPC server graceful shutdown error, forcing', { error });
        server.forceShutdown();
    }
    console.log('finished');
}
