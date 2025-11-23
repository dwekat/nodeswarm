import { ThreadPool, Priority, ThreadOptions } from "../src";

/**
 * Advanced usage examples for NodeSwarm
 */

async function example1() {
  console.log("Example 1: Job timeout");
  const pool = new ThreadPool();

  try {
    await pool.thread(
      { timeout: 100 },
      () => {
        const start = Date.now();
        while (Date.now() - start < 1000) {
          // Busy wait for 1 second
        }
        return "Should not reach here";
      }
    );
  } catch (error: any) {
    console.log(`Job timed out as expected: ${error.message}`);
  }

  await pool.close();
}

async function example2() {
  console.log("\nExample 2: Job cancellation with AbortSignal");
  const pool = new ThreadPool();
  const controller = new AbortController();

  const jobPromise = pool.thread(
    { signal: controller.signal },
    () => {
      const start = Date.now();
      while (Date.now() - start < 1000) {
        // Busy wait
      }
      return "Should not reach here";
    }
  );

  // Cancel after 100ms
  setTimeout(() => controller.abort(), 100);

  try {
    await jobPromise;
  } catch (error: any) {
    console.log(`Job cancelled: ${error.message}`);
  }

  await pool.close();
}

async function example3() {
  console.log("\nExample 3: Priority queue");
  const pool = new ThreadPool({ poolSize: 2 });

  const tasks = [
    pool.thread({ priority: Priority.LOW }, (x: number) => {
      console.log("  LOW priority task executed");
      return x;
    }, 1),
    pool.thread({ priority: Priority.HIGH }, (x: number) => {
      console.log("  HIGH priority task executed");
      return x;
    }, 2),
    pool.thread({ priority: Priority.NORMAL }, (x: number) => {
      console.log("  NORMAL priority task executed");
      return x;
    }, 3),
    pool.thread({ priority: Priority.HIGH }, (x: number) => {
      console.log("  HIGH priority task executed");
      return x;
    }, 4),
  ];

  await Promise.all(tasks);
  console.log("  (Notice HIGH priority tasks executed first)");

  await pool.close();
}

async function example4() {
  console.log("\nExample 4: Metrics tracking");
  const pool = new ThreadPool();

  // Run some tasks
  await Promise.all([
    pool.thread((x: number) => x * 2, 10),
    pool.thread((x: number) => x * 3, 20),
    pool.thread((x: number) => x * 4, 30),
  ]);

  // Get metrics
  const metrics = pool.getMetrics();
  console.log("  Completed jobs:", metrics.completedJobs);
  console.log("  Failed jobs:", metrics.failedJobs);
  console.log("  Average execution time:", 
    `${metrics.avgExecutionTime.toFixed(2)}ms`
  );
  console.log("  Worker count:", metrics.workerCount);

  await pool.close();
}

async function example5() {
  console.log("\nExample 5: Auto-scaling pool");
  const pool = new ThreadPool({
    poolSize: 2,
    minPoolSize: 2,
    maxPoolSize: 8,
    autoScale: true,
    scaleUpThreshold: 5,
  });

  console.log(`  Initial pool size: ${pool.size}`);

  // Create a burst of tasks
  const tasks = Array(20)
    .fill(0)
    .map((_, i) => 
      pool.thread((x: number) => {
        const start = Date.now();
        while (Date.now() - start < 100) {} // 100ms work
        return x;
      }, i)
    );

  await Promise.all(tasks);
  console.log(`  Final pool size: ${pool.size}`);
  console.log("  (Pool auto-scaled to handle load)");

  await pool.close();
}

async function example6() {
  console.log("\nExample 6: Strict mode validation");
  const pool = new ThreadPool({ strictMode: true });

  try {
    await pool.thread(() => {
      // This will be blocked by strict mode
      const fs = require("fs");
      return fs.readFileSync("/etc/passwd");
    });
  } catch (error: any) {
    console.log(`  Blocked unsafe code: ${error.message}`);
  }

  await pool.close();
}

async function example7() {
  console.log("\nExample 7: Combined options");
  const pool = new ThreadPool();

  const options: ThreadOptions = {
    timeout: 5000,
    priority: Priority.HIGH,
  };

  function heavyComputation(n: number): number {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }

  const result = await pool.thread(options, heavyComputation, 1000000);
  console.log(`  Computation result: ${result.toFixed(2)}`);

  await pool.close();
}

async function main() {
  console.log("NodeSwarm Advanced Examples\n");
  console.log("=".repeat(50));

  await example1();
  await example2();
  await example3();
  await example4();
  await example5();
  await example6();
  await example7();

  console.log("\n" + "=".repeat(50));
  console.log("All examples completed!");
}

main().catch(console.error);

