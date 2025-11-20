/**
 * Different workload types for benchmarking
 */

/**
 * Fibonacci calculation (CPU-intensive, recursive)
 */
export function fibonacci(n: number): number {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

/**
 * Prime number check (CPU-intensive)
 */
export function isPrime(num: number): boolean {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

/**
 * Count primes up to n (CPU-intensive)
 */
export function countPrimes(n: number): number {
  let count = 0;
  for (let i = 2; i <= n; i++) {
    if (isPrime(i)) count++;
  }
  return count;
}

/**
 * Matrix multiplication (CPU and memory intensive)
 */
export function matrixMultiply(size: number): number[][] {
  const a: number[][] = [];
  const b: number[][] = [];
  const result: number[][] = [];

  // Initialize matrices
  for (let i = 0; i < size; i++) {
    a[i] = [];
    b[i] = [];
    result[i] = [];
    for (let j = 0; j < size; j++) {
      a[i][j] = Math.random();
      b[i][j] = Math.random();
      result[i][j] = 0;
    }
  }

  // Multiply
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

/**
 * Hash computation (CPU-intensive string operations)
 */
export function computeHash(input: string, iterations: number): string {
  let hash = input;
  for (let i = 0; i < iterations; i++) {
    let newHash = "";
    for (let j = 0; j < hash.length; j++) {
      newHash += String.fromCharCode(
        hash.charCodeAt(j) ^ (i % 256)
      );
    }
    hash = newHash;
  }
  return hash;
}

/**
 * JSON parsing and manipulation
 */
export function processJSON(iterations: number): any {
  const data = {
    users: Array(100).fill(0).map((_, i) => ({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      scores: Array(10).fill(0).map(() => Math.random()),
    })),
  };

  for (let i = 0; i < iterations; i++) {
    const str = JSON.stringify(data);
    const parsed = JSON.parse(str);
    parsed.users.forEach((user: any) => {
      user.avgScore = user.scores.reduce(
        (a: number, b: number) => a + b, 0
      ) / user.scores.length;
    });
  }

  return data;
}

/**
 * Sorting operations
 */
export function heavySort(size: number): number[] {
  const arr = Array(size).fill(0).map(() => Math.random());
  
  // Multiple sorting passes
  for (let i = 0; i < 10; i++) {
    arr.sort((a, b) => b - a);
    arr.sort((a, b) => a - b);
  }
  
  return arr;
}

/**
 * Mixed workload
 */
export function mixedWorkload(): any {
  const fib = fibonacci(30);
  const primes = countPrimes(1000);
  const hash = computeHash("benchmark", 100);
  const sorted = heavySort(1000);
  
  return { fib, primes, hash: hash.length, sorted: sorted.length };
}

/**
 * Light workload (for high-throughput testing)
 */
export function lightWork(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

/**
 * Blocking sleep (simulates blocking operation)
 */
export function blockingWork(ms: number): number {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait
  }
  return Date.now() - start;
}

