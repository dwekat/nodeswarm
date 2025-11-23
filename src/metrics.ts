import { ThreadPoolMetrics } from "./types";

/**
 * Tracks and calculates thread pool metrics
 */
export class MetricsTracker {
  private completedJobs: number = 0;
  private failedJobs: number = 0;
  private totalExecutionTime: number = 0;
  private workerRestarts: number = 0;
  private startTime: number = Date.now();

  /**
   * Record a successful job completion
   */
  recordJobComplete(executionTime: number): void {
    this.completedJobs++;
    this.totalExecutionTime += executionTime;
  }

  /**
   * Record a failed job
   */
  recordJobFailure(): void {
    this.failedJobs++;
  }

  /**
   * Record a worker restart
   */
  recordWorkerRestart(): void {
    this.workerRestarts++;
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(
    activeJobs: number,
    queueDepth: number,
    workerCount: number
  ): ThreadPoolMetrics {
    return {
      completedJobs: this.completedJobs,
      failedJobs: this.failedJobs,
      activeJobs,
      queueDepth,
      workerCount,
      avgExecutionTime:
        this.completedJobs > 0
          ? this.totalExecutionTime / this.completedJobs
          : 0,
      totalExecutionTime: this.totalExecutionTime,
      workerRestarts: this.workerRestarts,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.completedJobs = 0;
    this.failedJobs = 0;
    this.totalExecutionTime = 0;
    this.workerRestarts = 0;
    this.startTime = Date.now();
  }
}

