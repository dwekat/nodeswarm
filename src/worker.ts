import { WorkerMessage } from "./ThreadPool.js";
import { parentPort } from "worker_threads";

// Cache compiled functions keyed by their source string
const fnCache = new Map<string, Function>();

parentPort!.on("message", async (message: WorkerMessage) => {
  let result: any, error: any;
  try {
    if (typeof message.fn !== "string" || !Array.isArray(message.args)) {
      throw new Error("Invalid message: fn must be string and args must be array");
    }
    let fn = fnCache.get(message.fn);
    if (fn === undefined) {
      fn = new Function("return " + message.fn)() as Function;
      fnCache.set(message.fn, fn);
    }
    result = await Promise.resolve(fn(...message.args));
  } catch (e: any) {
    // Preserve full error context for debugging
    error = {
      message: e.message,
      stack: e.stack,
      name: e.name,
    };
  }
  parentPort!.postMessage({ result, error });
});
