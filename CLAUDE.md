# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # Full build: clean → CJS → fix-cjs → ESM → types → hints
npm test                   # Run vitest (pretest compiles worker to test_tmp/)
npm run test:compat        # CJS/ESM compatibility tests (requires build first)
npm run benchmark          # NodeSwarm-only benchmark (builds first)
npm run benchmark:compare  # Compare against piscina, tinypool, workerpool (builds first)
npm run changeset          # Create changeset for release
```

Run a single test: `npx vitest run -t "test name"`

## Architecture

NodeSwarm is a worker thread pool library. Functions are serialized via `fn.toString()`, sent to worker threads, deserialized via `new Function()`, and executed.

**Core flows:**
- `ThreadPool.thread(fn, ...args)` → serialize fn → find/wait for available worker → `worker.postMessage()` → worker executes → result returned via promise.
- `ThreadPool.create(fn)` → scan fn source for `ref` variable names → match against global ref registry → return reusable function that dispatches to workers with `SharedArrayBuffer` refs attached.
- `ref(value)` → allocate `SharedArrayBuffer` → auto-detect variable name via stack trace file parsing → register in global registry → return `Ref` with `.value` getter/setter.

**Key source files:**
- `src/ThreadPool.ts` — Pool orchestrator: worker lifecycle, job scheduling, health monitoring, auto-scaling, `create()` factory
- `src/worker.ts` — Worker thread entry point: receives serialized functions, rehydrates refs from shared buffers, executes, returns results
- `src/ref.ts` — `ref()` factory: `SharedArrayBuffer`-backed shared state with auto name detection via stack trace parsing
- `src/types.ts` — All interfaces, Priority enum (HIGH=0, NORMAL=1, LOW=2), and `RefTransfer` type
- `src/priorityQueue.ts` — Three-tier priority queue (not heap-based)
- `src/metrics.ts` — Job completion/failure/timing tracking
- `src/validation.ts` — Strict mode: blocks dangerous patterns (require, import, eval, fs, process)

## Dual CJS/ESM Build

Source uses ESM syntax with explicit `.js` extensions in imports. Four tsconfig variants produce separate outputs:
- `tsconfig.cjs.json` → `dist/cjs/` (CommonJS)
- `tsconfig.esm.json` → `dist/esm/` (ES2020)
- `tsconfig.types.json` → `dist/types/` (declarations only)
- `tsconfig.worker.json` → `test_tmp/` (worker.ts + types.ts, for tests)

Post-build scripts: `fix-cjs-imports.js` replaces `import.meta.url` with a throw in CJS output (unreachable code path). `create-package-hints.js` adds `package.json` with `type` field to each dist subfolder.

Worker path resolution in `ThreadPool.getWorkerPath()` uses a `typeof __dirname` check to branch CJS vs ESM — the CJS path returns early so `import.meta.url` never executes in CJS builds.

## Test Setup

Tests use vitest with a `vi.mock("path")` to redirect worker resolution from `./worker.js` to `../test_tmp/worker.js` (the pretest-compiled worker). The mock must appear before the `import { ThreadPool }` statement.

## Benchmark Setup

Benchmarks import from the built CJS output via `require("../../dist/cjs")` (not `../src`) to avoid pulling source into compilation. Worker files in `benchmark/workers/` reference `require("../dist/workloads")` for the compiled workloads. Functions passed to `pool.thread()` must be self-contained — worker serialization doesn't capture closures or external references.

## Development Workflow

Red-Green TDD: write a failing test first (red), then write the minimal code to make it pass (green), then refactor. No code without a failing test.

## Serialization Constraint

Any function passed to `pool.thread()` is serialized as a string. It cannot reference variables, imports, or other functions from its outer scope. This applies to tests, benchmarks, and library consumers. Helper functions must be inlined.

**Exception**: `ref()` variables can be referenced inside functions passed to `pool.create()`. The `create()` method scans the function source for `<name>.value` patterns, matches them against the global ref registry, and injects the refs into the worker scope via a wrapper function. This only works with `pool.create()`, not `pool.thread()`.

## Shared Memory (ref)

`ref(value)` creates a `SharedArrayBuffer`-backed reference. The `.value` getter/setter reads/writes the shared buffer directly — no copying. Both main thread and worker threads see the same memory.

Name detection: `ref()` parses `Error().stack` frames, reads the source file from disk, and matches `const/let/var <name> = ref(...)` to extract the variable name. This works in vitest and standard Node.js. The V8 structured stack trace API (`Error.captureStackTrace` with sentinel) does not work reliably in vitest due to module transforms.

Worker-side rehydration: The worker receives `RefTransfer` objects (name + `SharedArrayBuffer` + type tag) and reconstructs lightweight `WorkerRef` wrappers. The function is wrapped in a `new Function()` that declares the ref variables in scope before invoking the user's function.
