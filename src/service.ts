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
import { Serialize2SWR, Serialize2WR } from './cache/serializers.js';

const server = new Server({
    'grpc.max_concurrent_streams': 1000,
    'grpc.max_receive_message_length': Infinity,
    'grpc.max_send_message_length': Infinity,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.keepalive_time_ms': 10000 // 10 seconds
});

const Cache = new CacheTyped<WatchResponse>(Serialize2WR);
const CacheSep = new CacheTyped<SeparatedWatchResponse[]>(Serialize2SWR);

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

const watch = async (call: ServerWritableStream<WatchRequest, WatchResponse>) => {
    const { folder } = call.request;
    const end = WatchInitialTime.startTimer({ folder });
    addHandlers(call);

    try {
        const resp = Cache.getResponse(folder);
        call.write(resp);
    } finally {
        end({ folder });
    }
};

const separatedWriter = async (
    msgs: SeparatedWatchResponse[],
    call: ServerWritableStream<WatchRequest, SeparatedWatchResponse>
) => {
    for (const msg of msgs) {
        if (call.write(msg)) continue;
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

const watchSeparated = async (call: ServerWritableStream<WatchRequest, SeparatedWatchResponse>) => {
    const { folder } = call.request;
    const end = WatchInitialTime.startTimer({ folder });
    addHandlers(call);

    try {
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
