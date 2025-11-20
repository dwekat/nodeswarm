import os from "os";
import path from "path";
import { Worker } from "worker_threads";

const actualPathResolve = path.resolve;

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: (...args: any[]) => {
    // if the last arg is './worker.js', replace the resolved path
    if (args[args.length - 1] === "./worker.js") {
      return path.join(__dirname, "../test_tmp/worker.js");
    }
    // otherwise, call the original resolve function
    return actualPathResolve(...args);
  },
}));

// must be imported after the mock
import { ThreadPool, Priority } from "../src";

describe("ThreadPool", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  afterEach(async () => {
    if (pool) {
      await pool.close();
    }
  });

  test("should create thread pool with default size", () => {
    expect(pool.size).toBe(require("os").cpus().length);
  });

  test("should execute a job and return the result", async () => {
    const result = await pool.thread((a: number, b: number) => a + b, 2, 3);
    expect(result).toBe(5);
  });

  test("should execute 10 blockThreadForOneSecond jobs concurrently", async () => {
    const arrayLen = os.cpus().length;
    const start = Date.now();
    const promises = Array(arrayLen)
      .fill(0)
      .map((_, i) => pool.thread(blockThreadForOneSecond));
    await Promise.all(promises);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1500); // adjust as needed based on your expectations
  });

  it("should not accept new jobs while closing", async () => {
    await pool.close();
    await expect(pool.thread(() => {})).rejects.toThrow(
      "Cannot accept new jobs while closing",
    );
  });

  it("should handle errors correctly", async () => {
    await expect(
      pool.thread(() => {
        throw new Error("error");
      }),
    ).rejects.toThrow("error");
  });

  it("should terminate all workers immediately", async () => {
    const testPool = new ThreadPool();
    const poolSize = testPool.size;
    const spy = jest.spyOn(Worker.prototype, "terminate");
    testPool.terminate();
    expect(spy).toHaveBeenCalledTimes(poolSize);
    spy.mockRestore();
  });

  it("should close all workers gracefully after completing ongoing jobs", async () => {
    const pool = new ThreadPool({ poolSize: 1 }); // One worker for simplicity
    const result = pool.thread(
      () => new Promise((resolve) => setTimeout(() => resolve("done"), 100)),
    );
    await pool.close();
    await expect(result).resolves.toBe("done");
  });

  it("should execute multiple jobs concurrently", async () => {
    const results = await Promise.all([
      pool.thread((a, b) => a + b, 1, 2),
      pool.thread((a, b) => a * b, 2, 3),
    ]);
    expect(results).toEqual([3, 6]);
  });

  it("should handle high load properly", async () => {
    const jobs = Array(1000).fill(0).map(() => pool.thread(() => 1 + 1));
    await expect(Promise.all(jobs)).resolves.not.toThrow();
  });

  // New tests for timeout functionality
  describe("Timeout functionality", () => {
    it("should timeout a long-running job", async () => {
      const testPool = new ThreadPool();
      await expect(
        testPool.thread(
          { timeout: 100 },
          () => {
            const start = Date.now();
            while (Date.now() - start < 1000) {}
            return "done";
          }
        )
      ).rejects.toThrow("TimeoutError");
      await testPool.close();
    }, 10000);

    it("should complete job before timeout", async () => {
      const result = await pool.thread(
        { timeout: 1000 },
        () => {
          return 42;
        }
      );
      expect(result).toBe(42);
    });
  });

  // New tests for cancellation
  describe("Cancellation functionality", () => {
    it("should cancel job with AbortSignal", async () => {
      const testPool = new ThreadPool();
      const controller = new AbortController();
      
      const jobPromise = testPool.thread(
        { signal: controller.signal },
        () => {
          const start = Date.now();
          while (Date.now() - start < 1000) {}
          return "done";
        }
      );

      setTimeout(() => controller.abort(), 50);

      await expect(jobPromise).rejects.toThrow("AbortError");
      await testPool.close();
    }, 10000);

    it("should reject if signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        pool.thread({ signal: controller.signal }, () => 42)
      ).rejects.toThrow("AbortError");
    });
  });

  // New tests for priority queue
  describe("Priority queue", () => {
    it("should respect priority levels in queue", async () => {
      const testPool = new ThreadPool({ poolSize: 1 });
      
      // Start a blocking job to fill the worker
      const blocker = testPool.thread(() => {
        const start = Date.now();
        while (Date.now() - start < 300) {}
        return 0;
      });

      // Wait to ensure worker is busy
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Queue multiple jobs with different priorities
      const lowJob = testPool.thread({ priority: Priority.LOW }, (x: number) => x, 1);
      const highJob = testPool.thread({ priority: Priority.HIGH }, (x: number) => x, 2);
      const normalJob = testPool.thread({ priority: Priority.NORMAL }, (x: number) => x, 3);

      // Wait for blocker to complete
      await blocker;
      
      // Now check which job completes first - HIGH should complete before others
      const raceResult = await Promise.race([
        highJob.then(() => "HIGH"),
        normalJob.then(() => "NORMAL"),
        lowJob.then(() => "LOW"),
      ]);
      
      expect(raceResult).toBe("HIGH");
      
      // Clean up remaining
      await Promise.all([lowJob, normalJob]);
      await testPool.close();
    });
  });

  // New tests for metrics
  describe("Metrics tracking", () => {
    it("should track completed jobs", async () => {
      pool.resetMetrics();
      
      await pool.thread(() => 1);
      await pool.thread(() => 2);
      await pool.thread(() => 3);

      const metrics = pool.getMetrics();
      expect(metrics.completedJobs).toBe(3);
      expect(metrics.failedJobs).toBe(0);
    });

    it("should track failed jobs", async () => {
      pool.resetMetrics();
      
      try {
        await pool.thread(() => {
          throw new Error("test error");
        });
      } catch {}

      const metrics = pool.getMetrics();
      expect(metrics.failedJobs).toBe(1);
    });

    it("should track execution time", async () => {
      pool.resetMetrics();
      
      await pool.thread(() => {
        const start = Date.now();
        while (Date.now() - start < 100) {}
        return 1;
      });

      const metrics = pool.getMetrics();
      expect(metrics.avgExecutionTime).toBeGreaterThan(50);
      expect(metrics.totalExecutionTime).toBeGreaterThan(50);
    });

    it("should track queue depth", async () => {
      const pool = new ThreadPool({ poolSize: 1 });
      
      // Start multiple jobs
      const promises = Array(5)
        .fill(0)
        .map(() => pool.thread(() => {
          const start = Date.now();
          while (Date.now() - start < 100) {}
          return 1;
        }));

      // Check metrics while jobs are running
      await new Promise((resolve) => setTimeout(resolve, 50));
      const metrics = pool.getMetrics();
      expect(metrics.queueDepth).toBeGreaterThan(0);
      
      await Promise.all(promises);
      await pool.close();
    });
  });

  // New tests for strict mode
  describe("Strict mode validation", () => {
    it("should block unsafe require() calls", async () => {
      const pool = new ThreadPool({ strictMode: true });
      
      await expect(
        pool.thread(() => {
          require("fs");
        })
      ).rejects.toThrow();
      
      await pool.close();
    });

    it("should block unsafe process access", async () => {
      const pool = new ThreadPool({ strictMode: true });
      
      await expect(
        pool.thread(() => {
          return process.env;
        })
      ).rejects.toThrow();
      
      await pool.close();
    });

    it("should allow safe functions in strict mode", async () => {
      const pool = new ThreadPool({ strictMode: true });
      
      const result = await pool.thread((x: number) => x * 2, 21);
      expect(result).toBe(42);
      
      await pool.close();
    });

    it("should allow all functions when strict mode is off", async () => {
      const pool = new ThreadPool({ strictMode: false });
      
      // This would normally be blocked
      const result = await pool.thread(() => {
        return 42;
      });
      expect(result).toBe(42);
      
      await pool.close();
    });
  });

  // New tests for error handling
  describe("Enhanced error handling", () => {
    it("should preserve error stack traces", async () => {
      try {
        await pool.thread(() => {
          throw new Error("Test error with stack");
        });
      } catch (error: any) {
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain("Test error with stack");
      }
    });

    it("should preserve error names", async () => {
      try {
        await pool.thread(() => {
          const err = new TypeError("Type error test");
          throw err;
        });
      } catch (error: any) {
        expect(error.name).toBe("TypeError");
      }
    });
  });

  // New tests for pool configuration
  describe("Pool configuration", () => {
    it("should respect custom pool size", () => {
      const customPool = new ThreadPool({ poolSize: 4 });
      expect(customPool.size).toBe(4);
      customPool.terminate();
    });

    it("should default to CPU count", () => {
      const defaultPool = new ThreadPool();
      expect(defaultPool.size).toBe(os.cpus().length);
      defaultPool.terminate();
    });
  });
});

function blockThreadForOneSecond() {
  const startTime = Date.now();
  while (Date.now() - startTime < 1000) {}
}

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}
