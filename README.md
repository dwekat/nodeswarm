# NodeSwarm

[![npm version](https://badge.fury.io/js/nodeswarm.svg)](https://badge.fury.io/js/nodeswarm)
[![Known Vulnerabilities](https://snyk.io/test/github/mdwekat/nodeswarm/badge.svg)](https://snyk.io/test/github/mdwekat/nodeswarm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready thread pool for Node.js with advanced features

NodeSwarm is a high-performance, feature-rich library for managing worker threads in Node.js. It enables effortless parallel execution of CPU-bound tasks with enterprise-grade features like timeouts, priorities, auto-scaling, and comprehensive metrics.

## Why NodeSwarm?

- **🚀 High Performance**: Optimized for throughput and latency
- **⚡ Simple API**: Execute any function in a thread with one line
- **🎯 Priority Queue**: HIGH, NORMAL, LOW priority job scheduling
- **⏱️ Timeout & Cancellation**: Built-in timeout and AbortController support
- **📊 Metrics**: Real-time monitoring of pool performance
- **🔄 Auto-Scaling**: Dynamic worker pool adjustment
- **🛡️ Strict Mode**: Security validation for safe execution
- **🔧 Health Monitoring**: Automatic worker restart on failure
- **📝 TypeScript**: Full type safety with strict mode
- **✅ Production Ready**: Comprehensive tests and error handling

## Installation

```bash
npm install nodeswarm
```

```bash
yarn add nodeswarm
```

```bash
pnpm add nodeswarm
```

## Quick Start

```typescript
import { ThreadPool } from "nodeswarm";

const pool = new ThreadPool();

// Execute any function in a worker thread
const result = await pool.thread((a, b) => a + b, 5, 10);
console.log(result); // 15

await pool.close();
```

## Performance

NodeSwarm delivers excellent performance across different workload types:

### Benchmark Results

| Benchmark                    | Avg (ms) | Ops/sec | P95 (ms) | P99 (ms) |
| ---------------------------- | -------- | ------- | -------- | -------- |
| Fibonacci (n=40)             | 342.50   | 2.92    | 365.20   | 375.80   |
| Count Primes (50k)           | 256.80   | 3.89    | 268.40   | 272.10   |
| Matrix Multiply (100x100)    | 189.30   | 5.28    | 198.70   | 201.50   |
| Hash Computation             | 145.60   | 6.87    | 152.30   | 155.20   |
| High Throughput (1000 tasks) | 856.20   | 1.17    | 892.50   | 905.30   |

_Benchmarks run on Apple Silicon M-series (8 cores)_

### vs Other Libraries

| Library    | Fibonacci (ms) | Primes (ms) | Total (ms) | vs NodeSwarm |
| ---------- | -------------- | ----------- | ---------- | ------------ |
| NodeSwarm  | 342            | 257         | 599        | baseline     |
| Piscina    | 358            | 265         | 623        | +4.0%        |
| Workerpool | 371            | 278         | 649        | +8.3%        |
| Tinypool   | 365            | 269         | 634        | +5.8%        |

NodeSwarm provides competitive performance with the most comprehensive feature set.

## Features

### 1. Simple API

Execute any function in a worker thread:

```typescript
const result = await pool.thread((x) => x * 2, 21);
// result: 42
```

### 2. Job Timeout

Set automatic timeout for long-running tasks:

```typescript
try {
  await pool.thread(
    { timeout: 5000 }, // 5 second timeout
    (n) => {
      // CPU-intensive work
      return heavyComputation(n);
    },
    1000000
  );
} catch (error) {
  console.error("Job timed out:", error);
}
```

### 3. Job Cancellation

Cancel jobs using AbortController:

```typescript
const controller = new AbortController();

const jobPromise = pool.thread(
  { signal: controller.signal },
  (n) => longRunningTask(n),
  100
);

// Cancel the job
controller.abort();
```

### 4. Priority Queue

Schedule jobs with different priorities:

```typescript
import { Priority } from "nodeswarm";

// High priority - executed first
await pool.thread({ priority: Priority.HIGH }, criticalTask);

// Normal priority - default
await pool.thread({ priority: Priority.NORMAL }, normalTask);

// Low priority - executed last
await pool.thread({ priority: Priority.LOW }, backgroundTask);
```

### 5. Real-time Metrics

Monitor your thread pool performance:

```typescript
const metrics = pool.getMetrics();

console.log({
  completedJobs: metrics.completedJobs,
  failedJobs: metrics.failedJobs,
  activeJobs: metrics.activeJobs,
  queueDepth: metrics.queueDepth,
  avgExecutionTime: metrics.avgExecutionTime,
  workerCount: metrics.workerCount,
  uptime: metrics.uptime,
});
```

### 6. Auto-Scaling

Automatically scale workers based on load:

```typescript
const pool = new ThreadPool({
  poolSize: 4,
  minPoolSize: 2,
  maxPoolSize: 16,
  autoScale: true,
  scaleUpThreshold: 10, // Scale up when queue has 10+ jobs
});
```

### 7. Strict Mode Security

Validate functions for security (enabled by default):

```typescript
const pool = new ThreadPool({ strictMode: true });

// This will be rejected - unsafe code detected
try {
  await pool.thread(() => {
    require("fs").readFileSync("/etc/passwd");
  });
} catch (error) {
  console.error("Blocked unsafe code:", error);
}
```

### 8. Worker Health Monitoring

Workers are automatically monitored and restarted on failure:

```typescript
// Workers automatically restart on crash
// No configuration needed - works out of the box
```

## API Reference

### ThreadPool

#### Constructor

```typescript
new ThreadPool(config?: ThreadPoolConfig)
```

**Config Options:**

- `poolSize?: number` - Number of workers (default: CPU count)
- `minPoolSize?: number` - Minimum workers for auto-scaling
- `maxPoolSize?: number` - Maximum workers for auto-scaling
- `autoScale?: boolean` - Enable auto-scaling (default: false)
- `scaleUpThreshold?: number` - Queue depth to trigger scale-up
- `scaleDownDelay?: number` - Idle time before scale-down (ms)
- `strictMode?: boolean` - Enable security validation (default: true)

#### Methods

##### thread()

Execute a function in a worker thread.

```typescript
// Simple usage
thread<R>(fn: (...args: any[]) => R, ...args: any[]): Promise<R>

// With options
thread<R>(
  options: ThreadOptions,
  fn: (...args: any[]) => R,
  ...args: any[]
): Promise<R>
```

**ThreadOptions:**

- `timeout?: number` - Timeout in milliseconds
- `signal?: AbortSignal` - AbortController signal
- `priority?: Priority` - Job priority (HIGH, NORMAL, LOW)

##### getMetrics()

Get real-time pool metrics.

```typescript
getMetrics(): ThreadPoolMetrics
```

**Returns:**

- `completedJobs: number` - Total completed jobs
- `failedJobs: number` - Total failed jobs
- `activeJobs: number` - Currently executing jobs
- `queueDepth: number` - Jobs waiting in queue
- `workerCount: number` - Current number of workers
- `avgExecutionTime: number` - Average execution time (ms)
- `totalExecutionTime: number` - Total execution time (ms)
- `workerRestarts: number` - Number of worker restarts
- `uptime: number` - Pool uptime (ms)

##### resetMetrics()

Reset all metrics to zero.

```typescript
resetMetrics(): void
```

##### close()

Gracefully close the pool after completing ongoing jobs.

```typescript
close(): Promise<void>
```

##### terminate()

Immediately terminate all workers.

```typescript
terminate(): void
```

#### Properties

##### size

Get current number of workers in the pool.

```typescript
readonly size: number
```

## Examples

### Basic Usage

```typescript
import { ThreadPool } from "nodeswarm";

const pool = new ThreadPool();

// Simple arithmetic
const sum = await pool.thread((a, b) => a + b, 5, 10);

// CPU-intensive task
const fib = await pool.thread((n) => {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}, 40);

// Multiple concurrent tasks
const tasks = Array(100)
  .fill(0)
  .map((_, i) => pool.thread((x) => x * x, i));
const results = await Promise.all(tasks);

await pool.close();
```

### Advanced Usage

```typescript
import { ThreadPool, Priority } from "nodeswarm";

const pool = new ThreadPool({
  poolSize: 8,
  autoScale: true,
  strictMode: true,
});

// With timeout and priority
const result = await pool.thread(
  {
    timeout: 10000,
    priority: Priority.HIGH,
  },
  (data) => processLargeDataset(data),
  bigData
);

// With cancellation
const controller = new AbortController();
const job = pool.thread(
  { signal: controller.signal },
  (n) => longTask(n),
  1000
);

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await job;
} catch (error) {
  if (error.message.includes("AbortError")) {
    console.log("Job was cancelled");
  }
}

// Monitor performance
const metrics = pool.getMetrics();
console.log(
  `Throughput: ${metrics.completedJobs / (metrics.uptime / 1000)} jobs/sec`
);

await pool.close();
```

## Use Cases

### Image Processing

```typescript
async function processImages(images: string[]) {
  const pool = new ThreadPool();

  const results = await Promise.all(
    images.map((img) => pool.thread({ timeout: 30000 }, processImage, img))
  );

  await pool.close();
  return results;
}

function processImage(imagePath: string) {
  // CPU-intensive image processing
  return processedImage;
}
```

### Data Analysis

```typescript
async function analyzeDataset(data: number[][]) {
  const pool = new ThreadPool({ autoScale: true });

  const chunks = chunkArray(data, 1000);
  const results = await Promise.all(
    chunks.map((chunk) =>
      pool.thread({ priority: Priority.HIGH }, analyze, chunk)
    )
  );

  await pool.close();
  return mergeResults(results);
}
```

### Cryptographic Operations

```typescript
async function hashPasswords(passwords: string[]) {
  const pool = new ThreadPool();

  const hashes = await Promise.all(
    passwords.map((pwd) => pool.thread(computeExpensiveHash, pwd))
  );

  await pool.close();
  return hashes;
}
```

## Security

NodeSwarm uses function serialization via `new Function()` for dynamic execution. This enables the simple API but requires careful usage.

⚠️ **CRITICAL: Never execute untrusted or user-provided code**

### Safe Usage

✅ **DO:**

- Use with your own, reviewed code
- Enable strict mode (default)
- Validate all inputs
- Review functions before execution

❌ **DON'T:**

- Execute user-provided code
- Pass untrusted functions
- Disable strict mode without understanding risks
- Use with eval'd or dynamically generated code

See [SECURITY.md](./SECURITY.md) for comprehensive security guidelines.

## Limitations

1. **Serialization**: Only serializable data (primitives, plain objects, arrays)
2. **Closures**: Functions cannot access outer scope variables
3. **Imports**: Functions cannot use external modules
4. **Classes**: Class instances cannot be passed
5. **CPU-Bound**: Optimized for CPU-intensive tasks, not I/O

## TypeScript Support

NodeSwarm is written in TypeScript with full type safety:

```typescript
import {
  ThreadPool,
  ThreadOptions,
  Priority,
  ThreadPoolMetrics,
} from "nodeswarm";

const pool = new ThreadPool({ poolSize: 4 });

// Type-safe function execution
const result: number = await pool.thread(
  (x: number, y: number): number => x + y,
  5,
  10
);

// Type-safe options
const options: ThreadOptions = {
  timeout: 5000,
  priority: Priority.HIGH,
};

// Type-safe metrics
const metrics: ThreadPoolMetrics = pool.getMetrics();
```

## Benchmarking

Run benchmarks on your machine:

```bash
npm run benchmark        # Standard benchmark suite
npm run benchmark:compare # Compare with other libraries
```

## Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and migration guides.

## License

MIT © [Mustafa Dwaikat](https://github.com/mdwekat)

## Acknowledgments

- Inspired by Java's ExecutorService and Go's worker pools
- Built on Node.js worker_threads
- Thanks to all contributors and users

---

**Note**: This is production-ready software. Please report issues on [GitHub](https://github.com/mdwekat/nodeswarm/issues).
