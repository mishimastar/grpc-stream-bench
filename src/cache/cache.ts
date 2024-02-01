import type { KV, WatchResponse } from '../proto/stream-bench.js';

import { randomBytes, randomUUID } from 'node:crypto';

export type CacheMap<T> = Map<string, T>;
export type InitialCondition = Record<string, [docs: number, doc_size: number]>;

export interface Cache<T> {
    getResponse(folder: string): T;
}

const getRandomKV = (folder: string, valueBytes: number): KV => ({
    folder,
    key: randomUUID(),
    value: randomBytes(valueBytes)
});

const cacheCondition: InitialCondition = {
    large: [1000, 50_000], // 1000 docs by 50KB, total ~50MB
    medium: [1000, 5_000], // 1000 docs by 5KB, total ~5MB
    small: [1000, 500] // 1000 docs by 5B, total ~500KB
};

export class CacheTyped<T> implements Cache<T> {
    #cache: CacheMap<T> = new Map();
    #serializer: (wr: WatchResponse) => T;
    #emptyInit: T;

    constructor(serializer: (wr: WatchResponse) => T, init: InitialCondition = cacheCondition) {
        this.#serializer = serializer;
        this.#emptyInit = serializer({ kv: [] });
        for (const [fold, [docs, doc_size]] of Object.entries(init)) {
            const wr: WatchResponse = { kv: [] };
            for (let i = 0; i < docs; i++) wr.kv.push(getRandomKV(fold, doc_size));
            this.#cache.set(fold, this.#serializer(wr));
        }
    }

    getResponse = (folder: string): T => this.#cache.get(folder) ?? this.#emptyInit;
}
