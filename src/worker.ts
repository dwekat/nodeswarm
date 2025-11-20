import { WorkerMessage } from "./ThreadPool.js";
import { parentPort } from "worker_threads";

parentPort!.on("message", async (message: WorkerMessage) => {
  let result: any, error: any;
  try {
    const fn = new Function("return " + message.fn)();
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
