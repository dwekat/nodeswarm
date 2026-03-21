#!/usr/bin/env node

/**
 * Verification script for unref() behavior on health check interval.
 *
 * Test 1: Terminate all workers manually - process should exit because the
 * health check interval is unreffed and won't keep the event loop alive.
 *
 * Test 2: Normal usage with close() - process exits cleanly.
 *
 * Without unref() on the interval, Test 1 would hang even after workers are terminated.
 */

const { ThreadPool } = require("./dist/cjs/index.js");

console.log("=== Test 1: Verify health check interval is unreffed ===");
console.log("Creating ThreadPool...");
const pool = new ThreadPool({ poolSize: 2 });

console.log("Executing a job...");
pool
  .thread((x, y) => x + y, 5, 7)
  .then((result) => {
    console.log(`Job completed with result: ${result}`);
    console.log("Now terminating all workers manually (without close())...");
    pool.terminate();
    console.log("Workers terminated. Process should exit naturally.");
    console.log("If health check interval is unreffed, process will exit in ~1 second.");
    console.log("If not unreffed, process would hang indefinitely.");
  })
  .catch((error) => {
    console.error("Job failed:", error);
    process.exit(1);
  });
