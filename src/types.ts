import { Worker } from "worker_threads";

/**
 * Priority levels for job execution
 */
export enum Priority {
  HIGH = 0,
  NORMAL = 1,
  LOW = 2,
}

/**
 * Options for thread execution
 */
export interface ThreadOptions {
  /**
   * Timeout in milliseconds. Job will be cancelled if 
   * it exceeds this duration.
   */
  timeout?: number;
  
  /**
   * AbortSignal for manual cancellation
   */
  signal?: AbortSignal;
  
  /**
   * Priority level for job scheduling
   */
  priority?: Priority;
}

/**
 * Configuration options for the thread pool
 */
export interface ThreadPoolConfig {
  /**
   * Number of worker threads to create
   * @default os.cpus().length
   */
  poolSize?: number;
  
  /**
   * Minimum pool size for dynamic scaling
   */
  minPoolSize?: number;
  
  /**
   * Maximum pool size for dynamic scaling
   */
  maxPoolSize?: number;
  
  /**
   * Enable auto-scaling based on queue depth
   * @default false
   */
  autoScale?: boolean;
  
  /**
   * Queue depth threshold to trigger scale-up
   * @default 10
   */
  scaleUpThreshold?: number;
  
  /**
   * Idle time before scaling down (ms)
   * @default 30000
   */
  scaleDownDelay?: number;
  
  /**
   * Enable strict validation mode
   * Performs additional security checks on functions
   * @default true
   */
  strictMode?: boolean;
}

/**
 * Metrics for monitoring thread pool performance
 */
export interface ThreadPoolMetrics {
  /**
   * Total number of completed jobs
   */
  completedJobs: number;
  
  /**
   * Total number of failed jobs
   */
  failedJobs: number;
  
  /**
   * Current number of active jobs
   */
  activeJobs: number;
  
  /**
   * Current queue depth
   */
  queueDepth: number;
  
  /**
   * Current number of workers
   */
  workerCount: number;
  
  /**
   * Average execution time (ms)
   */
  avgExecutionTime: number;
  
  /**
   * Total execution time (ms)
   */
  totalExecutionTime: number;
  
  /**
   * Number of worker restarts
   */
  workerRestarts: number;
  
  /**
   * Uptime in milliseconds
   */
  uptime: number;
}

/**
 * Represents a job to be executed in the thread pool
 */
export interface Job<R> {
  fn: (...args: any[]) => R;
  args: any[];
  resolve: (value: R | PromiseLike<R>) => void;
  reject: (reason?: any) => void;
  priority: Priority;
  timeout?: number;
  signal?: AbortSignal;
  startTime?: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Represents a message between the main thread and worker threads
 */
export interface WorkerMessage {
  fn: string;
  args: any[];
  result?: any;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

/**
 * Worker state tracking
 */
export interface WorkerState {
  worker: Worker;
  failureCount: number;
  lastHeartbeat: number;
  isHealthy: boolean;
}

