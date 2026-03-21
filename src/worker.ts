import { WorkerMessage, RefTransfer } from "./types.js";
import { parentPort } from "worker_threads";

// Cache compiled functions keyed by their source string
const fnCache = new Map<string, Function>();

// Header layout matches ref.ts
const HEADER_BYTES = 8;
const TYPE_NUMBER = 0;

/**
 * Lightweight ref wrapper for the worker side.
 * Reads/writes the same SharedArrayBuffer that the main thread holds.
 */
class WorkerRef {
  private readonly _i32: Int32Array;
  private readonly _f64: Float64Array;
  private readonly _type: number;

  constructor(buffer: SharedArrayBuffer, type: number) {
    this._type = type;
    this._i32 = new Int32Array(buffer, 0, 2);
    this._f64 = new Float64Array(buffer, HEADER_BYTES, 1);
  }

  get value(): number | string {
    if (this._type === TYPE_NUMBER) {
      return this._f64[0];
    }
    const byteLen = Atomics.load(this._i32, 1);
    const u8 = new Uint8Array(this._i32.buffer, HEADER_BYTES, byteLen);
    return new TextDecoder().decode(u8);
  }

  set value(v: number | string) {
    if (this._type === TYPE_NUMBER) {
      this._f64[0] = v as number;
    } else {
      const encoded = new TextEncoder().encode(v as string);
      const capacity = this._i32.buffer.byteLength - HEADER_BYTES;
      if (encoded.byteLength > capacity) {
        throw new Error(`String exceeds shared buffer capacity (${capacity} bytes)`);
      }
      const u8 = new Uint8Array(this._i32.buffer, HEADER_BYTES, capacity);
      u8.set(encoded);
      Atomics.store(this._i32, 1, encoded.byteLength);
    }
  }
}

/**
 * Build a wrapper function that injects ref variables into the function scope.
 * The refs are available as local variables with .value getters/setters.
 */
function buildRefWrapper(fnSource: string, refs: RefTransfer[]): string {
  const refSetup = refs
    .map((r, i) => `var ${r.name} = __refs__[${i}];`)
    .join("\n");

  return `return function(__refs__) {
  ${refSetup}
  var __fn__ = ${fnSource};
  return function() { return __fn__.apply(null, arguments); };
}`;
}

parentPort!.on("message", async (message: WorkerMessage) => {
  let result: any, error: any;
  try {
    if (typeof message.fn !== "string" || !Array.isArray(message.args)) {
      throw new Error("Invalid message: fn must be string and args must be array");
    }

    let fn: Function;

    if (message.refs && message.refs.length > 0) {
      // Build WorkerRef instances from transferred SharedArrayBuffers
      const workerRefs = message.refs.map((r) => new WorkerRef(r.buffer, r.type));

      // Cache key includes ref names to differentiate
      const cacheKey = message.fn + "\0" + message.refs.map((r) => r.name).join(",");
      let factory = fnCache.get(cacheKey) as ((refs: WorkerRef[]) => Function) | undefined;
      if (factory === undefined) {
        factory = new Function(buildRefWrapper(message.fn, message.refs))() as (refs: WorkerRef[]) => Function;
        fnCache.set(cacheKey, factory);
      }
      fn = factory(workerRefs);
    } else {
      fn = fnCache.get(message.fn) as Function;
      if (fn === undefined) {
        fn = new Function("return " + message.fn)() as Function;
        fnCache.set(message.fn, fn);
      }
    }

    result = await Promise.resolve(fn(...message.args));
  } catch (e: any) {
    // Preserve full error context for debugging
    error = {
      message: e.message,
      stack: e.stack,
      name: e.name,
    };
  }
  parentPort!.postMessage({ result, error });
});
