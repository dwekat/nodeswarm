import { ThreadPool } from "../src";

/**
 * Basic usage examples for NodeSwarm
 */

async function example1() {
  console.log("Example 1: Simple arithmetic");
  const pool = new ThreadPool();

  const result = await pool.thread((a: number, b: number) => a + b, 5, 10);
  console.log(`5 + 10 = ${result}`); // 15

  await pool.close();
}

async function example2() {
  console.log("\nExample 2: CPU-intensive task");
  const pool = new ThreadPool();

  function fibonacci(n: number): number {
    if (n < 2) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  const result = await pool.thread(fibonacci, 40);
  console.log(`Fibonacci(40) = ${result}`);

  await pool.close();
}

async function example3() {
  console.log("\nExample 3: Multiple concurrent tasks");
  const pool = new ThreadPool();

  const tasks = Array(10)
    .fill(0)
    .map((_, i) => pool.thread((x: number) => x * x, i));

  const results = await Promise.all(tasks);
  console.log("Squares:", results); // [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

  await pool.close();
}

async function example4() {
  console.log("\nExample 4: Using pool configuration");
  const pool = new ThreadPool({ poolSize: 4 });

  console.log(`Pool size: ${pool.size}`);

  const result = await pool.thread((x: number) => x * 2, 21);
  console.log(`21 * 2 = ${result}`);

  await pool.close();
}

async function example5() {
  console.log("\nExample 5: Error handling");
  const pool = new ThreadPool();

  try {
    await pool.thread(() => {
      throw new Error("Something went wrong!");
    });
  } catch (error: any) {
    console.log(`Caught error: ${error.message}`);
  }

  await pool.close();
}

async function main() {
  console.log("NodeSwarm Basic Examples\n");
  console.log("=".repeat(50));

  await example1();
  await example2();
  await example3();
  await example4();
  await example5();

  console.log("\n" + "=".repeat(50));
  console.log("All examples completed!");
}

main().catch(console.error);

