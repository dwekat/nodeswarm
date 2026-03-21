/**
 * Shared memory reference — a value backed by SharedArrayBuffer
 * that is accessible from both the main thread and worker threads.
 *
 * Uses V8 stack trace parsing to auto-detect the variable name
 * from the call site, enabling pool.create() to inject refs
 * into worker scope without explicit passing.
 */

// Global registry: name → Ref instance
const refRegistry = new Map<string, Ref<any>>();

// Header layout (first 8 bytes):
// [0..3] type tag: 0 = f64 number, 1 = string
// [4..7] string byte length (only for strings)
const HEADER_BYTES = 8;
const TYPE_NUMBER = 0;
const TYPE_STRING = 1;
const DEFAULT_STRING_CAPACITY = 1024; // max string bytes

export class Ref<T extends number | string> {
  /** Auto-detected variable name from call site */
  readonly name: string;
  /** The underlying shared buffer — survives structured clone */
  readonly buffer: SharedArrayBuffer;

  private readonly _i32: Int32Array;
  private readonly _f64: Float64Array;
  private readonly _type: number;

  constructor(initial: T, name: string) {
    this.name = name;
    this._type = typeof initial === "number" ? TYPE_NUMBER : TYPE_STRING;

    if (this._type === TYPE_NUMBER) {
      // 8-byte header + 8-byte f64
      this.buffer = new SharedArrayBuffer(HEADER_BYTES + 8);
      this._i32 = new Int32Array(this.buffer, 0, 2);
      this._f64 = new Float64Array(this.buffer, HEADER_BYTES, 1);
      Atomics.store(this._i32, 0, TYPE_NUMBER);
      this._f64[0] = initial as number;
    } else {
      // 8-byte header + string capacity
      this.buffer = new SharedArrayBuffer(HEADER_BYTES + DEFAULT_STRING_CAPACITY);
      this._i32 = new Int32Array(this.buffer, 0, 2);
      this._f64 = new Float64Array(this.buffer, HEADER_BYTES, 1);
      Atomics.store(this._i32, 0, TYPE_STRING);
      this._writeString(initial as string);
    }

    refRegistry.set(name, this);
  }

  get value(): T {
    if (this._type === TYPE_NUMBER) {
      return this._f64[0] as T;
    }
    return this._readString() as T;
  }

  set value(v: T) {
    if (this._type === TYPE_NUMBER) {
      this._f64[0] = v as number;
    } else {
      this._writeString(v as string);
    }
  }

  private _writeString(s: string): void {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(s);
    const capacity = this.buffer.byteLength - HEADER_BYTES;
    if (encoded.byteLength > capacity) {
      throw new Error(`String exceeds shared buffer capacity (${capacity} bytes)`);
    }
    const u8 = new Uint8Array(this.buffer, HEADER_BYTES, capacity);
    u8.set(encoded);
    // Store length atomically so readers see consistent data
    Atomics.store(this._i32, 1, encoded.byteLength);
  }

  private _readString(): string {
    const byteLen = Atomics.load(this._i32, 1);
    const u8 = new Uint8Array(this.buffer, HEADER_BYTES, byteLen);
    const decoder = new TextDecoder();
    return decoder.decode(u8);
  }

  /**
   * Serialize for transfer to worker via postMessage.
   * The SharedArrayBuffer itself survives structured clone.
   */
  toTransfer(): { __ref: true; name: string; buffer: SharedArrayBuffer; type: number } {
    return {
      __ref: true,
      name: this.name,
      buffer: this.buffer,
      type: this._type,
    };
  }

  /**
   * Reconstruct a Ref on the worker side from a transferred buffer.
   */
  static fromTransfer<T extends number | string>(
    transfer: { name: string; buffer: SharedArrayBuffer; type: number }
  ): Ref<T> {
    const instance = Object.create(Ref.prototype) as Ref<T>;
    (instance as any).name = transfer.name;
    (instance as any).buffer = transfer.buffer;
    (instance as any)._type = transfer.type;
    (instance as any)._i32 = new Int32Array(transfer.buffer, 0, 2);
    if (transfer.type === TYPE_NUMBER) {
      (instance as any)._f64 = new Float64Array(transfer.buffer, HEADER_BYTES, 1);
    } else {
      (instance as any)._f64 = new Float64Array(transfer.buffer, HEADER_BYTES, 1);
    }
    return instance;
  }
}

const REF_PATTERN = /(?:const|let|var)\s+(\w+)\s*=\s*ref\s*[(<]/;

/** Try to extract the ref variable name from a source file at a given line */
function extractNameFromFile(filePath: string, lineNumber: number): string | null {
  try {
    const fs = require("node:fs");
    const source = fs.readFileSync(filePath, "utf-8");
    const line = source.split("\n")[lineNumber - 1];
    const match = line?.match(REF_PATTERN);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Auto-detect the variable name from the call site.
 *
 * Walks the Error().stack string frames, reads each source file,
 * and looks for `const/let/var <name> = ref(...)` on the matching line.
 */
function detectName(): string {
  const stackStr = new Error("ref-detect").stack || "";
  const framePattern = /(?:at\s+.*?\s+\(|at\s+)([^):\s]+):(\d+):\d+/g;
  let frameMatch;
  while ((frameMatch = framePattern.exec(stackStr)) !== null) {
    const name = extractNameFromFile(frameMatch[1], Number.parseInt(frameMatch[2], 10));
    if (name) return name;
  }

  return `__ref_${refRegistry.size}`;
}

/**
 * Create a shared memory reference.
 *
 * @param initial - The initial value (number or string)
 * @returns A Ref backed by SharedArrayBuffer
 */
export function ref<T extends number | string>(initial: T): Ref<T> {
  const name = detectName();
  return new Ref(initial, name);
}

/** Get all registered refs */
export function getRefRegistry(): Map<string, Ref<any>> {
  return refRegistry;
}
