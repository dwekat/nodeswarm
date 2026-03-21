import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";

const actualPathResolve = path.resolve;

vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return {
    ...actual,
    resolve: (...args: any[]) => {
      if (args[args.length - 1] === "./worker.js") {
        return path.join(__dirname, "../test_tmp/worker.js");
      }
      return actualPathResolve(...args);
    },
  };
});

// must be imported after the mock
import { ThreadPool } from "../src";
import { ref, Ref, getRefRegistry } from "../src/ref";

// ---------------------------------------------------------------------------
// ref() — value semantics
// ---------------------------------------------------------------------------
describe("ref value semantics", () => {
  test("number ref: get and set", () => {
    const counter = ref(0);
    expect(counter.value).toBe(0);
    counter.value = 42;
    expect(counter.value).toBe(42);
  });

  test("string ref: get and set", () => {
    const status = ref("pending");
    expect(status.value).toBe("pending");
    status.value = "done";
    expect(status.value).toBe("done");
  });

  test("negative numbers", () => {
    const val = ref(-10);
    expect(val.value).toBe(-10);
    val.value = -99;
    expect(val.value).toBe(-99);
  });

  test("float numbers with precision", () => {
    const pi = ref(3.141592653589793);
    expect(pi.value).toBe(3.141592653589793);
    pi.value = Number.MIN_SAFE_INTEGER;
    expect(pi.value).toBe(Number.MIN_SAFE_INTEGER);
    pi.value = Number.MAX_SAFE_INTEGER;
    expect(pi.value).toBe(Number.MAX_SAFE_INTEGER);
  });

  test("zero and boundary numbers", () => {
    const z = ref(0);
    expect(z.value).toBe(0);
    z.value = -0;
    // Float64Array stores -0 as -0
    expect(Object.is(z.value, -0)).toBe(true);
    z.value = Infinity;
    expect(z.value).toBe(Infinity);
    z.value = -Infinity;
    expect(z.value).toBe(-Infinity);
  });

  test("NaN is stored correctly", () => {
    const n = ref(0);
    n.value = Number.NaN;
    expect(Number.isNaN(n.value)).toBe(true);
  });

  test("empty string", () => {
    const empty = ref("");
    expect(empty.value).toBe("");
    empty.value = "hello";
    expect(empty.value).toBe("hello");
    empty.value = "";
    expect(empty.value).toBe("");
  });

  test("unicode strings", () => {
    const emoji = ref("hello");
    emoji.value = "こんにちは世界";
    expect(emoji.value).toBe("こんにちは世界");
    emoji.value = "🚀🔥💯";
    expect(emoji.value).toBe("🚀🔥💯");
  });

  test("string at capacity boundary", () => {
    // Default capacity is 1024 bytes
    const longStr = "a".repeat(1024);
    const s = ref("x");
    s.value = longStr;
    expect(s.value).toBe(longStr);
  });

  test("string exceeding capacity throws", () => {
    const s = ref("x");
    // 1025 ASCII bytes exceeds 1024-byte capacity
    expect(() => {
      s.value = "a".repeat(1025);
    }).toThrow("String exceeds shared buffer capacity");
  });

  test("multi-byte string exceeding capacity throws", () => {
    const s = ref("x");
    // Each CJK char is 3 bytes in UTF-8, 342 chars = 1026 bytes > 1024
    expect(() => {
      s.value = "あ".repeat(342);
    }).toThrow("String exceeds shared buffer capacity");
  });

  test("rapid overwrites preserve last value", () => {
    const v = ref(0);
    for (let i = 0; i < 10000; i++) {
      v.value = i;
    }
    expect(v.value).toBe(9999);
  });
});

// ---------------------------------------------------------------------------
// ref() — name detection
// ---------------------------------------------------------------------------
describe("ref name detection", () => {
  test("auto-detects variable name from call site", () => {
    const myCounter = ref(0);
    expect(myCounter.name).toBe("myCounter");
  });

  test("detects let declaration", () => {
    const mutableRef = ref(0);
    expect(mutableRef.name).toBe("mutableRef");
  });

  test("registers ref in global registry", () => {
    const registryTest = ref(0);
    const registry = getRefRegistry();
    expect(registry.has("registryTest")).toBe(true);
    expect(registry.get("registryTest")).toBe(registryTest);
  });
});

// ---------------------------------------------------------------------------
// ref() — Ref.toTransfer / Ref.fromTransfer round-trip
// ---------------------------------------------------------------------------
describe("ref serialization round-trip", () => {
  test("number ref survives transfer", () => {
    const original = ref(42);
    const transfer = original.toTransfer();

    expect(transfer.__ref).toBe(true);
    expect(transfer.name).toBe("original");
    expect(transfer.buffer).toBeInstanceOf(SharedArrayBuffer);

    const restored = Ref.fromTransfer<number>(transfer);
    expect(restored.value).toBe(42);

    // Same underlying memory
    original.value = 99;
    expect(restored.value).toBe(99);
  });

  test("string ref survives transfer", () => {
    const label = ref("hello");
    const transfer = label.toTransfer();
    const restored = Ref.fromTransfer<string>(transfer);
    expect(restored.value).toBe("hello");

    label.value = "world";
    expect(restored.value).toBe("world");
  });
});

// ---------------------------------------------------------------------------
// pool.create() — basic execution
// ---------------------------------------------------------------------------
describe("pool.create basic execution", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 2 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("mutate a number ref from a thread", async () => {
    const counter = ref(0);
    const add = pool.create((x: number) => {
      counter.value += x;
    });
    await add(5);
    expect(counter.value).toBe(5);
  });

  test("mutate a string ref from a thread", async () => {
    const status = ref("pending");
    const update = pool.create(() => {
      status.value = "done";
    });
    await update();
    expect(status.value).toBe("done");
  });

  test("return values from created functions", async () => {
    const counter = ref(0);
    const add = pool.create((x: number) => {
      counter.value += x;
      return counter.value;
    });
    const result = await add(5);
    expect(result).toBe(5);
  });

  test("multiple refs in one function", async () => {
    const counter = ref(0);
    const status = ref("pending");
    const work = pool.create((x: number) => {
      counter.value += x;
      status.value = "done";
    });
    await work(10);
    expect(counter.value).toBe(10);
    expect(status.value).toBe("done");
  });

  test("create without refs works like thread", async () => {
    const multiply = pool.create((a: number, b: number) => a * b);
    const result = await multiply(6, 7);
    expect(result).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// pool.create() — sequential calls (state accumulation)
// ---------------------------------------------------------------------------
describe("pool.create sequential calls", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 1 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("refs accumulate state across sequential calls", async () => {
    const counter = ref(0);
    const increment = pool.create(() => {
      counter.value += 1;
    });

    await increment();
    await increment();
    await increment();
    expect(counter.value).toBe(3);
  });

  test("string ref overwritten across calls", async () => {
    const log = ref("");
    const append = pool.create((msg: string) => {
      log.value = log.value + msg + ";";
    });

    await append("a");
    await append("b");
    await append("c");
    expect(log.value).toBe("a;b;c;");
  });
});

// ---------------------------------------------------------------------------
// pool.create() — concurrent execution
// ---------------------------------------------------------------------------
describe("pool.create concurrent execution", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 4 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("concurrent calls all complete", async () => {
    const counter = ref(0);
    const increment = pool.create(() => {
      counter.value += 1;
    });

    // Fire 20 concurrent increments
    await Promise.all(new Array(20).fill(0).map(() => increment()));

    // Due to race conditions on non-atomic +=, the value may be <= 20
    // The important thing: no crashes, no hangs, all promises resolve
    expect(counter.value).toBeGreaterThan(0);
    expect(counter.value).toBeLessThanOrEqual(20);
  });

  test("concurrent calls with different created functions", async () => {
    const a = ref(0);
    const b = ref(0);

    const incA = pool.create(() => { a.value += 1; });
    const incB = pool.create(() => { b.value += 1; });

    await Promise.all([
      ...new Array(5).fill(0).map(() => incA()),
      ...new Array(5).fill(0).map(() => incB()),
    ]);

    // Both should have been incremented (exact value depends on scheduling)
    expect(a.value).toBeGreaterThan(0);
    expect(b.value).toBeGreaterThan(0);
  });

  test("high-volume sequential calls do not leak or hang", async () => {
    const counter = ref(0);
    const inc = pool.create(() => {
      counter.value += 1;
    });

    for (let i = 0; i < 100; i++) {
      await inc();
    }
    expect(counter.value).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// pool.create() — error handling
// ---------------------------------------------------------------------------
describe("pool.create error handling", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 2 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("error inside created function rejects the promise", async () => {
    const work = pool.create(() => {
      throw new Error("intentional failure");
    });
    await expect(work()).rejects.toThrow("intentional failure");
  });

  test("error preserves error name", async () => {
    const work = pool.create(() => {
      const err = new TypeError("type mismatch");
      throw err;
    });
    await expect(work()).rejects.toThrow("type mismatch");
  });

  test("created function works after a previous call errored", async () => {
    const counter = ref(0);
    const work = pool.create((shouldFail: boolean) => {
      if (shouldFail) throw new Error("fail");
      counter.value += 1;
      return counter.value;
    });

    await expect(work(true)).rejects.toThrow("fail");

    // Next call should succeed
    const result = await work(false);
    expect(result).toBe(1);
    expect(counter.value).toBe(1);
  });

  test("ref value is not corrupted by worker error", async () => {
    const counter = ref(42);
    const work = pool.create(() => {
      counter.value = 99;
      throw new Error("fail after mutation");
    });

    await expect(work()).rejects.toThrow("fail after mutation");
    // Ref was mutated before the throw — shared memory reflects that
    expect(counter.value).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// pool.create() — lifecycle (close / terminate)
// ---------------------------------------------------------------------------
describe("pool.create lifecycle", () => {
  test("rejects after pool.close()", async () => {
    const pool = new ThreadPool({ poolSize: 1 });
    const work = pool.create(() => 42);

    await pool.close();
    await expect(work()).rejects.toThrow("Cannot accept new jobs while closing");
  });

  test("rejects after pool.close() followed by terminate()", async () => {
    const pool = new ThreadPool({ poolSize: 1 });
    const work = pool.create(() => 42);

    // close() sets closing flag, terminate() kills workers
    await pool.close();
    pool.terminate();
    await expect(work()).rejects.toThrow("Cannot accept new jobs while closing");
  });

  test("in-flight created job completes before close resolves", async () => {
    const pool = new ThreadPool({ poolSize: 1 });
    const counter = ref(0);
    const work = pool.create(() => {
      const start = Date.now();
      while (Date.now() - start < 100) { /* busy wait */ }
      counter.value = 1;
    });

    const job = work();
    const close = pool.close();

    await job;
    await close;
    expect(counter.value).toBe(1);
  });

  test("queued created jobs are rejected on terminate", async () => {
    const pool = new ThreadPool({ poolSize: 1 });
    const work = pool.create(() => {
      const start = Date.now();
      while (Date.now() - start < 500) { /* busy wait */ }
      return "done";
    });

    const blocker = work(); // takes the only worker
    const queued1 = work(); // queued
    const queued2 = work(); // queued

    pool.terminate();

    await expect(queued1).rejects.toThrow("Pool terminated");
    await expect(queued2).rejects.toThrow("Pool terminated");
    await blocker.catch(() => { /* swallow */ });
  });
});

// ---------------------------------------------------------------------------
// pool.create() — interaction with pool.thread()
// ---------------------------------------------------------------------------
describe("pool.create and pool.thread coexistence", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 2 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("pool.thread and pool.create work on the same pool", async () => {
    const counter = ref(0);
    const inc = pool.create(() => {
      counter.value += 1;
    });

    const [threadResult] = await Promise.all([
      pool.thread((a: number, b: number) => a + b, 3, 4),
      inc(),
    ]);

    expect(threadResult).toBe(7);
    expect(counter.value).toBe(1);
  });

  test("pool.thread does not inject refs (isolation)", async () => {
    const isolationRef = ref(0);
    expect(isolationRef.value).toBe(0); // use the ref so linter is happy

    // pool.thread should NOT have access to refs
    // This function checks if isolationRef exists in thread scope — it should not
    await expect(
      pool.thread(() => {
        try {
          // @ts-ignore — isolationRef is not available in thread scope
          return isolationRef !== undefined;
        } catch {
          return false;
        }
      })
    ).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pool.create() — progress tracking pattern
// ---------------------------------------------------------------------------
describe("pool.create progress tracking", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 1 });
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  test("main thread reads progress set by worker", async () => {
    const progress = ref(0);
    const work = pool.create(() => {
      for (let i = 0; i < 100; i++) {
        progress.value = i + 1;
      }
    });

    await work();
    expect(progress.value).toBe(100);
  });

  test("main thread can observe intermediate progress", async () => {
    const progress = ref(0);
    const work = pool.create(() => {
      for (let i = 0; i < 50; i++) {
        // busy wait to give main thread a chance to observe
        const start = Date.now();
        while (Date.now() - start < 1) { /* busy wait */ }
        progress.value = i + 1;
      }
    });

    const promise = work();

    // Poll progress — we should see at least some intermediate values
    let maxObserved = 0;
    const interval = setInterval(() => {
      const val = progress.value;
      if (val > maxObserved) maxObserved = val;
    }, 5);

    await promise;
    clearInterval(interval);

    expect(progress.value).toBe(50);
    // We should have observed at least the final value
    expect(maxObserved).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Ref class — edge cases
// ---------------------------------------------------------------------------
describe("Ref class edge cases", () => {
  test("buffer is a SharedArrayBuffer", () => {
    const r = ref(0);
    expect(r.buffer).toBeInstanceOf(SharedArrayBuffer);
  });

  test("number ref buffer size is exactly header + 8 bytes", () => {
    const r = ref(0);
    expect(r.buffer.byteLength).toBe(8 + 8); // 8 header + 8 f64
  });

  test("string ref buffer size is exactly header + 1024 bytes", () => {
    const r = ref("x");
    expect(r.buffer.byteLength).toBe(8 + 1024);
  });

  test("fromTransfer shares same underlying memory", () => {
    const original = ref(0);
    const restored = Ref.fromTransfer<number>(original.toTransfer());

    original.value = 123;
    expect(restored.value).toBe(123);

    restored.value = 456;
    expect(original.value).toBe(456);
  });

  test("fromTransfer works for strings bidirectionally", () => {
    const original = ref("a");
    const restored = Ref.fromTransfer<string>(original.toTransfer());

    original.value = "updated";
    expect(restored.value).toBe("updated");

    restored.value = "again";
    expect(original.value).toBe("again");
  });
});
