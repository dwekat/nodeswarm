import { ThreadPool } from "../src";
import { fibonacci, countPrimes, mixedWorkload } from "./workloads";
import os from "os";

interface ComparisonResult {
  library: string;
  fibonacci: number;
  primes: number;
  mixed: number;
  total: number;
}

/**
 * Run benchmark with NodeSwarm
 */
async function benchmarkNodeSwarm(): Promise<ComparisonResult> {
  const pool = new ThreadPool();
  const concurrentTasks = os.cpus().length;

  // Fibonacci
  const fibStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.thread(fibonacci, 40))
  );
  const fibTime = Date.now() - fibStart;

  // Prime counting
  const primeStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.thread(countPrimes, 50000))
  );
  const primeTime = Date.now() - primeStart;

  // Mixed workload
  const mixedStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.thread(mixedWorkload))
  );
  const mixedTime = Date.now() - mixedStart;

  await pool.close();

  return {
    library: "NodeSwarm",
    fibonacci: fibTime,
    primes: primeTime,
    mixed: mixedTime,
    total: fibTime + primeTime + mixedTime,
  };
}

/**
 * Run benchmark with Piscina
 */
async function benchmarkPiscina(): Promise<ComparisonResult> {
  let Piscina: any;
  try {
    Piscina = require("piscina").default;
  } catch {
    return {
      library: "Piscina",
      fibonacci: -1,
      primes: -1,
      mixed: -1,
      total: -1,
    };
  }

  const pool = new Piscina({
    filename: require.resolve("./workers/piscina-worker.js"),
  });
  const concurrentTasks = os.cpus().length;

  const fibStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "fibonacci", args: [40] }))
  );
  const fibTime = Date.now() - fibStart;

  const primeStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "countPrimes", args: [50000] }))
  );
  const primeTime = Date.now() - primeStart;

  const mixedStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "mixedWorkload", args: [] }))
  );
  const mixedTime = Date.now() - mixedStart;

  await pool.destroy();

  return {
    library: "Piscina",
    fibonacci: fibTime,
    primes: primeTime,
    mixed: mixedTime,
    total: fibTime + primeTime + mixedTime,
  };
}

/**
 * Run benchmark with workerpool
 */
async function benchmarkWorkerpool(): Promise<ComparisonResult> {
  let workerpool: any;
  try {
    workerpool = require("workerpool");
  } catch {
    return {
      library: "Workerpool",
      fibonacci: -1,
      primes: -1,
      mixed: -1,
      total: -1,
    };
  }

  const pool = workerpool.pool(
    require.resolve("./workers/workerpool-worker.js")
  );
  const concurrentTasks = os.cpus().length;

  const fibStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.exec("fibonacci", [40]))
  );
  const fibTime = Date.now() - fibStart;

  const primeStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.exec("countPrimes", [50000]))
  );
  const primeTime = Date.now() - primeStart;

  const mixedStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.exec("mixedWorkload", []))
  );
  const mixedTime = Date.now() - mixedStart;

  await pool.terminate();

  return {
    library: "Workerpool",
    fibonacci: fibTime,
    primes: primeTime,
    mixed: mixedTime,
    total: fibTime + primeTime + mixedTime,
  };
}

/**
 * Run benchmark with tinypool
 */
async function benchmarkTinypool(): Promise<ComparisonResult> {
  let Tinypool: any;
  try {
    Tinypool = require("tinypool").Tinypool;
  } catch {
    return {
      library: "Tinypool",
      fibonacci: -1,
      primes: -1,
      mixed: -1,
      total: -1,
    };
  }

  const pool = new Tinypool({
    filename: require.resolve("./workers/tinypool-worker.js"),
  });
  const concurrentTasks = os.cpus().length;

  const fibStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "fibonacci", args: [40] }))
  );
  const fibTime = Date.now() - fibStart;

  const primeStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "countPrimes", args: [50000] }))
  );
  const primeTime = Date.now() - primeStart;

  const mixedStart = Date.now();
  await Promise.all(
    Array(concurrentTasks)
      .fill(0)
      .map(() => pool.run({ type: "mixedWorkload", args: [] }))
  );
  const mixedTime = Date.now() - mixedStart;

  await pool.destroy();

  return {
    library: "Tinypool",
    fibonacci: fibTime,
    primes: primeTime,
    mixed: mixedTime,
    total: fibTime + primeTime + mixedTime,
  };
}

/**
 * Format comparison results
 */
function formatComparison(results: ComparisonResult[]): string {
  let output = "\n";
  output += "| Library | Fibonacci (ms) | Primes (ms) | Mixed (ms) ";
  output += "| Total (ms) | vs NodeSwarm |\n";
  output += "|---------|----------------|-------------|------------|";
  output += "------------|-------------|\n";

  const nodeswarmTotal = results.find(
    (r) => r.library === "NodeSwarm"
  )?.total || 0;

  results.forEach((result) => {
    const fib = result.fibonacci >= 0 ? result.fibonacci : "N/A";
    const primes = result.primes >= 0 ? result.primes : "N/A";
    const mixed = result.mixed >= 0 ? result.mixed : "N/A";
    const total = result.total >= 0 ? result.total : "N/A";
    
    let comparison = "baseline";
    if (result.library !== "NodeSwarm" && result.total >= 0) {
      const diff = ((result.total - nodeswarmTotal) / nodeswarmTotal) * 100;
      comparison = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    } else if (result.total < 0) {
      comparison = "not installed";
    }

    output += `| ${result.library} | ${fib} | ${primes} | ${mixed} `;
    output += `| ${total} | ${comparison} |\n`;
  });

  return output;
}

/**
 * Main comparison
 */
async function main() {
  console.log("🏁 Thread Pool Library Comparison\n");
  console.log("=".repeat(60));
  console.log(`Running on ${os.cpus().length} CPU cores\n`);

  const results: ComparisonResult[] = [];

  console.log("Testing NodeSwarm...");
  results.push(await benchmarkNodeSwarm());
  console.log("✓ NodeSwarm completed\n");

  console.log("Testing Piscina...");
  results.push(await benchmarkPiscina());
  console.log("✓ Piscina completed\n");

  console.log("Testing Workerpool...");
  results.push(await benchmarkWorkerpool());
  console.log("✓ Workerpool completed\n");

  console.log("Testing Tinypool...");
  results.push(await benchmarkTinypool());
  console.log("✓ Tinypool completed\n");

  console.log("=".repeat(60));
  console.log("\n📊 Comparison Results\n");
  console.log(formatComparison(results));

  console.log("\nNote: Install libraries to test them:");
  console.log("  npm install piscina workerpool tinypool\n");
}

main().catch(console.error);

