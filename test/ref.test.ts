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
import { ref } from "../src/ref";

describe("ref", () => {
  test("should create a number ref with .value getter/setter", () => {
    const counter = ref(0);
    expect(counter.value).toBe(0);
    counter.value = 42;
    expect(counter.value).toBe(42);
  });

  test("should create a string ref with .value getter/setter", () => {
    const status = ref("pending");
    expect(status.value).toBe("pending");
    status.value = "done";
    expect(status.value).toBe("done");
  });

  test("should auto-detect variable name from call site", () => {
    const myCounter = ref(0);
    expect(myCounter.name).toBe("myCounter");
  });

  test("should support negative numbers", () => {
    const val = ref(-10);
    expect(val.value).toBe(-10);
    val.value = -99;
    expect(val.value).toBe(-99);
  });

  test("should support float numbers", () => {
    const pi = ref(3.14);
    expect(pi.value).toBeCloseTo(3.14);
    pi.value = 2.718;
    expect(pi.value).toBeCloseTo(2.718);
  });

  test("should support empty string", () => {
    const empty = ref("");
    expect(empty.value).toBe("");
    empty.value = "hello";
    expect(empty.value).toBe("hello");
  });
});

describe("pool.create with ref", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool({ poolSize: 2 });
  });

  afterEach(async () => {
    if (pool) {
      await pool.close();
    }
  });

  test("should mutate a number ref from a thread", async () => {
    const counter = ref(0);

    const add = pool.create((x: number) => {
      counter.value += x;
    });

    await add(5);
    expect(counter.value).toBe(5);
  });

  test("should mutate a string ref from a thread", async () => {
    const status = ref("pending");

    const update = pool.create(() => {
      status.value = "done";
    });

    await update();
    expect(status.value).toBe("done");
  });

  test("should share refs across multiple calls", async () => {
    const counter = ref(0);

    const increment = pool.create(() => {
      counter.value += 1;
    });

    await increment();
    await increment();
    await increment();
    expect(counter.value).toBe(3);
  });

  test("should support multiple refs in one function", async () => {
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

  test("should return values from created functions", async () => {
    const counter = ref(0);

    const add = pool.create((x: number) => {
      counter.value += x;
      return counter.value;
    });

    const result = await add(5);
    expect(result).toBe(5);
  });

  test("should read ref value from main thread while worker modifies it", async () => {
    const progress = ref(0);

    const work = pool.create(() => {
      for (let i = 0; i < 100; i++) {
        progress.value = i + 1;
      }
    });

    await work();
    expect(progress.value).toBe(100);
  });
});
