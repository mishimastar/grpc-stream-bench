import { createServer, STATUS_CODES } from 'node:http';

const server = createServer((_, res) => {
    res.writeHead(200, STATUS_CODES[200]);
    res.end('iamgood');
});

export const Ready = async (port?: number) => {
    if (port && (typeof port !== 'number' || port <= 0)) {
        console.log('readiness: bad port, using 5000 instead', { port });
    }
    port = port || 5000;
    await new Promise<void>((res) => server.listen(port, res));
    console.log('readiness: server started', { port });
};

export const NotReady = async () => {
    if (!server.listening) {
        console.log('readiness: call NotReady before Ready');
        return;
    }
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
};
