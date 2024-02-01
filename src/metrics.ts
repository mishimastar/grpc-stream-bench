/* eslint-disable @typescript-eslint/no-misused-promises */
import { createServer, ServerResponse, STATUS_CODES } from 'node:http';

import { contentType, Gauge, Histogram, linearBuckets, register } from 'prom-client';

export class ResponseError extends Error {
    constructor(message: string, public code: number, cause?: Error) {
        super(message, cause ? { cause } : undefined);
    }
}

export async function EndResponse(response: ServerResponse, error: ResponseError): Promise<void>;
export async function EndResponse(response: ServerResponse, code: number, message?: Buffer | string): Promise<void>;
export async function EndResponse(
    res: ServerResponse,
    arg1: number | ResponseError,
    arg2?: Buffer | string
): Promise<void> {
    if (res.destroyed) return;
    const code = typeof arg1 === 'number' ? arg1 : arg1.code;
    const msg = arg2 || undefined;
    res.writeHead(code, STATUS_CODES[code]);
    return new Promise((resolve) => res.end(msg, resolve));
}

export const WatchInitialTime = new Histogram({
    name: 'stream_bench_watch_initial_time',
    help: 'Stream bench watchers first responce time',
    labelNames: ['folder'],
    buckets: [...linearBuckets(0.001, 0.001, 19), ...linearBuckets(0.02, 0.01, 9), ...linearBuckets(0.25, 0.25, 39)]
});

const CreateDefaultMetrics = () => {
    const cpuUsage = new Gauge({
        name: 'stream_bench_cpu_seconds_total',
        help: 'Stream bench total user and system CPU time spent in seconds.',
        aggregator: 'average'
    });
    const resMemory = new Gauge({
        name: 'stream_bench_resident_memory_bytes',
        help: 'Stream bench resident memory size in bytes.',
        aggregator: 'average'
    });
    const heapTotalG = new Gauge({
        name: 'stream_bench_heap_total_bytes',
        help: 'Stream bench heap total size in bytes.',
        aggregator: 'average'
    });
    const heapUsedG = new Gauge({
        name: 'stream_bench_heap_used_bytes',
        help: 'Stream bench heap used size in bytes.',
        aggregator: 'average'
    });
    const externalG = new Gauge({
        name: 'stream_bench_external_mem_bytes',
        help: 'Stream bench external mem size in bytes.',
        aggregator: 'average'
    });
    const arrBufG = new Gauge({
        name: 'stream_bench_array_buffers_bytes',
        help: 'Stream bench external mem size in bytes.',
        aggregator: 'average'
    });
    return () => {
        const { user, system } = process.cpuUsage();
        cpuUsage.set((user + system) / 1e6);
        const { arrayBuffers, external, heapTotal, heapUsed, rss } = process.memoryUsage();
        resMemory.set(rss);
        heapTotalG.set(heapTotal);
        heapUsedG.set(heapUsed);
        externalG.set(external);
        arrBufG.set(arrayBuffers);
    };
};

const collectDM = CreateDefaultMetrics();

const metrics = createServer((req, res) => {
    const data: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
        data.push(chunk);
    }).on('error', (err) => {
        console.log('stream-bench: metrics request error', {
            err,
            method: req.method,
            url: req.url,
            headers: req.headers
        });
    });
    req.on('end', async () => {
        try {
            if (req.url !== '/metrics') {
                await EndResponse(res, 404, 'only metrics path supported');
                return;
            }
            if (res.writableEnded) return;

            switch (req.method) {
                case 'GET':
                    collectDM();
                    res.setHeader('Content-Type', contentType);
                    res.end(Buffer.from(await register.metrics()));

                    break;
                default:
                    await EndResponse(res, 400);
            }
        } catch (error) {
            console.log('stream-bench: metrics request handle error', {
                error,
                method: req.method,
                url: req.url,
                headers: req.headers
            });
            res.end();
            await EndResponse(res, 500, String(error));
        }
    });
});

metrics.keepAliveTimeout = 300_000;
metrics.requestTimeout = 1000;

export const StartMetrics = async () => {
    await new Promise<void>((res) => metrics.listen(8000, res));
    console.log('stream-bench: metrics started 📈📊');
};
export async function StopMetrics() {
    await new Promise<void>((res, rej) => metrics.close((e) => (e ? rej(e) : res())));
    console.log('stream-bench: metrics finished 📊📉');
}
