import { Job, Priority } from "./types";

/**
 * Priority queue implementation for job scheduling
 * Jobs are organized by priority level (HIGH, NORMAL, LOW)
 */
export class PriorityQueue<T> {
  private queues: Map<Priority, Job<T>[]>;

  constructor() {
    this.queues = new Map([
      [Priority.HIGH, []],
      [Priority.NORMAL, []],
      [Priority.LOW, []],
    ]);
  }

  /**
   * Add a job to the queue based on its priority
   */
  enqueue(job: Job<T>): void {
    const queue = this.queues.get(job.priority);
    if (queue) {
      queue.push(job);
    }
  }

  /**
   * Remove and return the highest priority job
   */
  dequeue(): Job<T> | undefined {
    // Check HIGH priority first
    const highQueue = this.queues.get(Priority.HIGH);
    if (highQueue && highQueue.length > 0) {
      return highQueue.shift();
    }

    // Then NORMAL priority
    const normalQueue = this.queues.get(Priority.NORMAL);
    if (normalQueue && normalQueue.length > 0) {
      return normalQueue.shift();
    }

    // Finally LOW priority
    const lowQueue = this.queues.get(Priority.LOW);
    if (lowQueue && lowQueue.length > 0) {
      return lowQueue.shift();
    }

    return undefined;
  }

  /**
   * Get total number of jobs across all priorities
   */
  get length(): number {
    let total = 0;
    this.queues.forEach((queue) => {
      total += queue.length;
    });
    return total;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Clear all jobs from the queue
   */
  clear(): void {
    this.queues.forEach((queue) => queue.length = 0);
  }

  /**
   * Get queue depth by priority
   */
  getDepthByPriority(priority: Priority): number {
    return this.queues.get(priority)?.length || 0;
  }
}

