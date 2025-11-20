import os from "os";
import { resolve } from "path";
import { Worker } from "worker_threads";
import { PriorityQueue } from "./priorityQueue";
import { MetricsTracker } from "./metrics";
import { validateFunction, validateArguments } from "./validation";
import {
  ThreadPoolConfig,
  ThreadOptions,
  Job,
  Priority,
  WorkerMessage,
  ThreadPoolMetrics,
  WorkerState,
} from "./types";

// Re-export WorkerMessage for worker.ts
export type { WorkerMessage } from "./types";

/**
 * ThreadPool class manages a pool of worker threads and schedules jobs
 * to be executed in the threads with advanced features like timeouts,
 * priorities, health monitoring, and metrics.
 */
export class ThreadPool {
  private workers: WorkerState[] = [];
  private queue: PriorityQueue<any>;
  private workerJobMap = new Map<Worker, Job<any>>();
  private closing: boolean = false;
  private closeResolvers: Array<() => void> = [];
  private metrics: MetricsTracker;
  private healthCheckInterval?: NodeJS.Timeout;

  private static readonly workerPath = resolve(__dirname, "./worker.js");
  private readonly config: Required<ThreadPoolConfig>;

  /**
   * Constructor initializes the ThreadPool with configuration options.
   *
   * @param config - Configuration for the thread pool
   */
  constructor(config?: ThreadPoolConfig) {
    const cpuCount = os.cpus().length;
    this.config = {
      poolSize: config?.poolSize ?? cpuCount,
      minPoolSize: config?.minPoolSize ?? cpuCount,
      maxPoolSize: config?.maxPoolSize ?? cpuCount * 2,
      autoScale: config?.autoScale ?? false,
      scaleUpThreshold: config?.scaleUpThreshold ?? 10,
      scaleDownDelay: config?.scaleDownDelay ?? 30000,
      strictMode: config?.strictMode ?? true,
    };

    this.queue = new PriorityQueue();
    this.metrics = new MetricsTracker();
    this.initializeWorkers(this.config.poolSize);
    this.startHealthCheck();
  }

  /**
   * Returns the current size of the thread pool.
   */
  get size(): number {
    return this.workers.length;
  }

  /**
   * Creates and initializes worker threads in the pool.
   */
  private initializeWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createWorker();
    }
  }

  /**
   * Creates a single worker and registers event handlers
   */
  private createWorker(): WorkerState {
    const worker = new Worker(ThreadPool.workerPath);
    const workerState: WorkerState = {
      worker,
      failureCount: 0,
      lastHeartbeat: Date.now(),
      isHealthy: true,
    };

    worker.on("message", (message) => this.onMessage(worker, message));
    worker.on("error", (error) => this.onError(worker, error));
    worker.on("exit", (code) => this.onExit(worker, code));

    this.workers.push(workerState);
    return workerState;
  }

  /**
   * Start health check monitoring for all workers
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkWorkerHealth();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check health of all workers and restart unhealthy ones
   */
  private checkWorkerHealth(): void {
    const now = Date.now();
    const maxInactivity = 60000; // 60 seconds

    for (let i = 0; i < this.workers.length; i++) {
      const workerState = this.workers[i];
      const job = this.workerJobMap.get(workerState.worker);

      // If worker has a job but hasn't responded in a long time
      if (job && now - workerState.lastHeartbeat > maxInactivity) {
        workerState.isHealthy = false;
        this.restartWorker(i);
      }
    }
  }

  /**
   * Restart a worker at the specified index
   */
  private restartWorker(index: number): void {
    const workerState = this.workers[index];
    const job = this.workerJobMap.get(workerState.worker);

    // Terminate the old worker
    workerState.worker.terminate();
    this.workerJobMap.delete(workerState.worker);

    // If there was a job, put it back in the queue
    if (job) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
      this.queue.enqueue(job);
    }

    // Create a new worker
    const newWorkerState = this.createWorker();
    this.workers[index] = newWorkerState;
    this.metrics.recordWorkerRestart();

    // Process next job if available
    this.processNextJob();
  }

  /**
   * Executes the specified function in a worker thread.
   *
   * @param fn - The function to execute
   * @param args - The arguments to pass to the function
   * @returns A promise that resolves with the result
   */
  thread<R>(fn: (...args: any[]) => R, ...args: any[]): Promise<R>;
  thread<R>(
    options: ThreadOptions,
    fn: (...args: any[]) => R,
    ...args: any[]
  ): Promise<R>;
  thread<R>(...params: any[]): Promise<R> {
    let options: ThreadOptions = {};
    let fn: (...args: any[]) => R;
    let args: any[];

    // Parse overloaded parameters
    if (typeof params[0] === "function") {
      fn = params[0];
      args = params.slice(1);
    } else {
      options = params[0] || {};
      fn = params[1];
      args = params.slice(2);
    }

    return new Promise((resolve, reject) => {
      if (this.closing) {
        return reject(new Error("Cannot accept new jobs while closing"));
      }

      // Validate function and arguments in strict mode
      if (this.config.strictMode) {
        try {
          validateFunction(fn);
          validateArguments(args);
        } catch (error) {
          return reject(error);
        }
      }

      const job: Job<R> = {
        fn,
        args,
        resolve,
        reject,
        priority: options.priority ?? Priority.NORMAL,
        timeout: options.timeout,
        signal: options.signal,
      };

      // Handle AbortSignal
      if (options.signal) {
        if (options.signal.aborted) {
          return reject(new Error("AbortError: Job was aborted"));
        }
        options.signal.addEventListener("abort", () => {
          this.cancelJob(job);
        });
      }

      this.enqueue(job);
    });
  }

  /**
   * Cancel a job
   */
  private cancelJob(job: Job<any>): void {
    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }
    job.reject(new Error("AbortError: Job was aborted"));
    this.metrics.recordJobFailure();
  }

  /**
   * Enqueues the job or runs it immediately if a worker is available.
   *
   * @param job - The job to enqueue
   */
  private enqueue(job: Job<any>): void {
    const availableWorker = this.findAvailableWorker();
    if (availableWorker) {
      this.runJob(availableWorker.worker, job);
    } else {
      this.queue.enqueue(job);

      // Auto-scale if enabled
      if (
        this.config.autoScale &&
        this.queue.length >= this.config.scaleUpThreshold &&
        this.workers.length < this.config.maxPoolSize
      ) {
        this.scaleUp();
      }
    }
  }

  /**
   * Find an available worker
   */
  private findAvailableWorker(): WorkerState | undefined {
    return this.workers.find(
      (ws) => ws.isHealthy && !this.workerJobMap.has(ws.worker)
    );
  }

  /**
   * Scale up the worker pool
   */
  private scaleUp(): void {
    const newWorkerCount = Math.min(
      this.workers.length + 1,
      this.config.maxPoolSize
    );
    const toAdd = newWorkerCount - this.workers.length;

    for (let i = 0; i < toAdd; i++) {
      this.createWorker();
      this.processNextJob();
    }
  }

  /**
   * Sends the job to a worker for execution.
   *
   * @param worker - The worker to run the job
   * @param job - The job to run
   */
  private runJob(worker: Worker, job: Job<any>): void {
    job.startTime = Date.now();
    this.workerJobMap.set(worker, job);

    // Set up timeout if specified
    if (job.timeout) {
      job.timeoutId = setTimeout(() => {
        this.handleJobTimeout(worker, job);
      }, job.timeout);
    }

    const message: WorkerMessage = { fn: job.fn.toString(), args: job.args };
    worker.postMessage(message);

    // Update worker heartbeat
    const workerState = this.workers.find((ws) => ws.worker === worker);
    if (workerState) {
      workerState.lastHeartbeat = Date.now();
    }
  }

  /**
   * Handle job timeout
   */
  private handleJobTimeout(worker: Worker, job: Job<any>): void {
    this.workerJobMap.delete(worker);
    job.reject(new Error("TimeoutError: Job execution exceeded timeout"));
    this.metrics.recordJobFailure();

    // Terminate and restart the worker since it's stuck
    const index = this.workers.findIndex((ws) => ws.worker === worker);
    if (index !== -1) {
      this.restartWorker(index);
    }
  }

  /**
   * Handles messages received from worker threads.
   *
   * @param worker - The worker that sent the message
   * @param message - The received message
   */
  private onMessage(worker: Worker, message: WorkerMessage): void {
    const job = this.workerJobMap.get(worker);
    if (!job) return;

    // Clear timeout if set
    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    // Calculate execution time
    const executionTime = job.startTime ? Date.now() - job.startTime : 0;

    // Update worker heartbeat
    const workerState = this.workers.find((ws) => ws.worker === worker);
    if (workerState) {
      workerState.lastHeartbeat = Date.now();
      workerState.failureCount = 0; // Reset failure count on success
    }

    if (message.error) {
      const error = new Error(message.error.message);
      error.name = message.error.name;
      if (message.error.stack) {
        error.stack = message.error.stack;
      }
      job.reject(error);
      this.metrics.recordJobFailure();
    } else {
      job.resolve(message.result);
      this.metrics.recordJobComplete(executionTime);
    }

    this.workerJobMap.delete(worker);

    // Check if we're closing and all jobs are done
    if (
      this.closing &&
      this.queue.isEmpty &&
      this.workerJobMap.size === 0
    ) {
      this.closeResolvers.forEach((resolve) => resolve());
      this.closeResolvers = [];
    }

    // Process next job
    this.processNextJob();
  }

  /**
   * Process the next job in the queue
   */
  private processNextJob(): void {
    if (!this.queue.isEmpty) {
      const availableWorker = this.findAvailableWorker();
      if (availableWorker) {
        const nextJob = this.queue.dequeue();
        if (nextJob) {
          this.runJob(availableWorker.worker, nextJob);
        }
      }
    }
  }

  /**
   * Handles errors received from worker threads.
   *
   * @param worker - The worker that experienced the error
   * @param error - The error received
   */
  private onError(worker: Worker, error: any): void {
    const workerState = this.workers.find((ws) => ws.worker === worker);
    if (workerState) {
      workerState.failureCount++;
      workerState.isHealthy = false;
    }

    const job = this.workerJobMap.get(worker);
    if (job) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
      job.reject(error);
      this.metrics.recordJobFailure();
    }

    this.workerJobMap.delete(worker);

    // Restart the worker
    const index = this.workers.findIndex((ws) => ws.worker === worker);
    if (index !== -1) {
      this.restartWorker(index);
    }
  }

  /**
   * Handles worker exit
   */
  private onExit(worker: Worker, code: number): void {
    if (code !== 0 && !this.closing) {
      const index = this.workers.findIndex((ws) => ws.worker === worker);
      if (index !== -1) {
        this.restartWorker(index);
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ThreadPoolMetrics {
    return this.metrics.getMetrics(
      this.workerJobMap.size,
      this.queue.length,
      this.workers.length
    );
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /**
   * Gracefully closes all worker threads after completing ongoing jobs.
   */
  async close(): Promise<void> {
    this.closing = true;

    // Stop health check immediately
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // If there are jobs in progress or queue, wait for completion
    if (!this.queue.isEmpty || this.workerJobMap.size > 0) {
      await new Promise<void>((resolve) => {
        this.closeResolvers.push(resolve);
      });
    }

    this.terminate();
  }

  /**
   * Immediately terminates all worker threads.
   */
  terminate(): void {
    // Ensure health check is stopped
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    this.workers.forEach((ws) => ws.worker.terminate());
    this.workers = [];
    this.workerJobMap.clear();
  }
}
