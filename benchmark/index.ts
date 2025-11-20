import { ThreadPool } from "../src";
import {
  fibonacci,
  countPrimes,
  matrixMultiply,
  computeHash,
  processJSON,
  heavySort,
  mixedWorkload,
  lightWork,
  blockingWork,
} from "./workloads";

interface BenchmarkResult {
  name: string;
  totalTime: number;
  avgTime: number;
  opsPerSec: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Calculate percentiles
 */
function calculatePercentile(times: number[], percentile: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

/**
 * Run a benchmark test
 */
async function runBenchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = Date.now();
    await fn();
    const iterTime = Date.now() - iterStart;
    times.push(iterTime);
  }

  const totalTime = Date.now() - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = (iterations / totalTime) * 1000;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    name,
    totalTime,
    avgTime,
    opsPerSec,
    minTime,
    maxTime,
    p50: calculatePercentile(times, 50),
    p95: calculatePercentile(times, 95),
    p99: calculatePercentile(times, 99),
  };
}

/**
 * Format benchmark results as table
 */
function formatResults(results: BenchmarkResult[]): string {
  let output = "\n";
  output += "| Benchmark | Total (ms) | Avg (ms) | Ops/sec | Min (ms) ";
  output += "| Max (ms) | P50 (ms) | P95 (ms) | P99 (ms) |\n";
  output += "|-----------|------------|----------|---------|----------|";
  output += "----------|----------|----------|----------|\n";

  results.forEach((result) => {
    output += `| ${result.name} `;
    output += `| ${result.totalTime.toFixed(0)} `;
    output += `| ${result.avgTime.toFixed(2)} `;
    output += `| ${result.opsPerSec.toFixed(2)} `;
    output += `| ${result.minTime.toFixed(2)} `;
    output += `| ${result.maxTime.toFixed(2)} `;
    output += `| ${result.p50.toFixed(2)} `;
    output += `| ${result.p95.toFixed(2)} `;
    output += `| ${result.p99.toFixed(2)} |\n`;
  });

  return output;
}

/**
 * Main benchmark suite
 */
async function main() {
  console.log("🚀 NodeSwarm Benchmark Suite\n");
  console.log("=".repeat(60));

  const results: BenchmarkResult[] = [];
  const pool = new ThreadPool();
  const concurrentTasks = pool.size;

  console.log(`Running on ${concurrentTasks} threads\n`);

  // Benchmark 1: Fibonacci (CPU-intensive, recursive)
  console.log("📊 Benchmark 1: Fibonacci (n=40)");
  const fibResult = await runBenchmark(
    "Fibonacci (n=40)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(fibonacci, 40));
      await Promise.all(promises);
    },
    5
  );
  results.push(fibResult);
  console.log(`   ✓ Completed in ${fibResult.totalTime}ms\n`);

  // Benchmark 2: Prime counting
  console.log("📊 Benchmark 2: Prime Counting (n=50000)");
  const primeResult = await runBenchmark(
    "Count Primes (50k)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(countPrimes, 50000));
      await Promise.all(promises);
    },
    5
  );
  results.push(primeResult);
  console.log(`   ✓ Completed in ${primeResult.totalTime}ms\n`);

  // Benchmark 3: Matrix multiplication
  console.log("📊 Benchmark 3: Matrix Multiplication (100x100)");
  const matrixResult = await runBenchmark(
    "Matrix Multiply (100x100)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(matrixMultiply, 100));
      await Promise.all(promises);
    },
    5
  );
  results.push(matrixResult);
  console.log(`   ✓ Completed in ${matrixResult.totalTime}ms\n`);

  // Benchmark 4: Hash computation
  console.log("📊 Benchmark 4: Hash Computation");
  const hashResult = await runBenchmark(
    "Hash Computation (1000 iter)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(computeHash, "benchmark", 1000));
      await Promise.all(promises);
    },
    10
  );
  results.push(hashResult);
  console.log(`   ✓ Completed in ${hashResult.totalTime}ms\n`);

  // Benchmark 5: JSON processing
  console.log("📊 Benchmark 5: JSON Processing");
  const jsonResult = await runBenchmark(
    "JSON Processing (100 iter)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(processJSON, 100));
      await Promise.all(promises);
    },
    10
  );
  results.push(jsonResult);
  console.log(`   ✓ Completed in ${jsonResult.totalTime}ms\n`);

  // Benchmark 6: Heavy sorting
  console.log("📊 Benchmark 6: Heavy Sorting");
  const sortResult = await runBenchmark(
    "Heavy Sort (10k elements)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(heavySort, 10000));
      await Promise.all(promises);
    },
    10
  );
  results.push(sortResult);
  console.log(`   ✓ Completed in ${sortResult.totalTime}ms\n`);

  // Benchmark 7: Mixed workload
  console.log("📊 Benchmark 7: Mixed Workload");
  const mixedResult = await runBenchmark(
    "Mixed Workload",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(mixedWorkload));
      await Promise.all(promises);
    },
    5
  );
  results.push(mixedResult);
  console.log(`   ✓ Completed in ${mixedResult.totalTime}ms\n`);

  // Benchmark 8: High-throughput (light work)
  console.log("📊 Benchmark 8: High Throughput (light work)");
  const throughputResult = await runBenchmark(
    "High Throughput (1000 tasks)",
    async () => {
      const promises = Array(1000)
        .fill(0)
        .map(() => pool.thread(lightWork, 10, 20));
      await Promise.all(promises);
    },
    3
  );
  results.push(throughputResult);
  console.log(`   ✓ Completed in ${throughputResult.totalTime}ms\n`);

  // Benchmark 9: Blocking work
  console.log("📊 Benchmark 9: Blocking Work (parallel)");
  const blockingResult = await runBenchmark(
    "Blocking Work (100ms each)",
    async () => {
      const promises = Array(concurrentTasks)
        .fill(0)
        .map(() => pool.thread(blockingWork, 100));
      await Promise.all(promises);
    },
    5
  );
  results.push(blockingResult);
  console.log(`   ✓ Completed in ${blockingResult.totalTime}ms\n`);

  await pool.close();

  // Display results
  console.log("=".repeat(60));
  console.log("\n📈 Benchmark Results\n");
  console.log(formatResults(results));

  // Display metrics
  const metrics = pool.getMetrics();
  console.log("\n📊 Thread Pool Metrics\n");
  console.log(`Total Jobs Completed: ${metrics.completedJobs}`);
  console.log(`Total Jobs Failed: ${metrics.failedJobs}`);
  console.log(`Average Execution Time: ${metrics.avgExecutionTime.toFixed(2)}ms`);
  console.log(`Total Execution Time: ${metrics.totalExecutionTime}ms`);
  console.log(`Worker Restarts: ${metrics.workerRestarts}`);
  console.log(`Uptime: ${(metrics.uptime / 1000).toFixed(2)}s`);

  console.log("\n✅ Benchmark suite completed!\n");
}

main().catch(console.error);

