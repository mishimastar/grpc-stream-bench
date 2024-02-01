import { once } from 'node:events';
import { writeHeapSnapshot } from 'node:v8';
import { StartMetrics, StopMetrics } from './metrics';
import { NotReady, Ready } from './readiness';
import { StartGRPC, StopGRPC } from './service';

process.on('SIGUSR2', () => {
    const path = `/tmp/Heap-${Date.now()}-${process.pid}.heapsnapshot`;
    writeHeapSnapshot(path);
    console.log('snapshot', { path });
});

async function start() {
    await StartMetrics();

    await StartGRPC();

    await Ready();
    await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')]);
    await NotReady();

    await StopGRPC();

    await StopMetrics();
}

start().catch((error) => {
    console.error('stream-bench: fatal error', { error });
});
