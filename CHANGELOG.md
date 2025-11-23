# Changelog

## 2.0.2

### Patch Changes

- fe22825: - Update @babel/traverse from 7.23.0 to 7.28.5
  - Add Prettier and EditorConfig configuration for consistent code formatting

## 2.0.1

### Patch Changes

- Add Buy Me A Coffee button to README

## 2.0.0

### Major Changes

- ad1eede: Production-ready v1.0.0 release with enterprise features:
  - Job timeout & cancellation with AbortController support
  - Priority queue system (HIGH, NORMAL, LOW priorities)
  - Worker health monitoring and automatic restart on failure
  - Real-time metrics and performance monitoring
  - Auto-scaling thread pool with configurable thresholds
  - Strict mode security validation (enabled by default)
  - Comprehensive benchmark suite vs competitors (Piscina, Workerpool, Tinypool)
  - Full TypeScript strict mode with zero linter errors
  - 20+ new comprehensive tests covering all features
  - Complete documentation overhaul (README, SECURITY, CHANGELOG, CONTRIBUTING)
  - Advanced examples for all features
  - Event-driven pool closing (replaced inefficient polling)
  - Enhanced error handling with full stack trace preservation

### Minor Changes

- Add full ESM (ES Modules) and CommonJS dual module support:
  - Dual build system with separate CJS and ESM outputs
  - Proper package.json exports field with conditional exports
  - Module type hints in dist folders for better resolution
  - Universal worker path resolution for both module systems
  - Compatibility tests for both ESM and CJS
  - Tree-shaking support in ESM builds
  - Works seamlessly in modern bundlers (Vite, Rollup) and legacy tools (Webpack, Node CJS)
  - Fully backward compatible - existing CommonJS users unaffected

## 1.1.0

### Minor Changes

- **Full ESM (ES Modules) support**: Package now supports both ESM and CommonJS
- **Dual build system**: Separate builds for CJS (`dist/cjs`) and ESM (`dist/esm`) with proper conditional exports
- **Package.json exports field**: Proper conditional exports for modern tooling and tree-shaking
- **Module type hints**: package.json files in dist folders for better module resolution
- **Compatibility tests**: Dedicated ESM and CJS compatibility test suites
- **Universal worker path resolution**: Works seamlessly in both ESM and CJS environments

### Changed

- Build system now outputs three separate builds: `dist/cjs`, `dist/esm`, `dist/types`
- Worker path resolution improved to detect and handle both module systems automatically
- Package exports configured for optimal tree-shaking in ESM
- Documentation updated with both ESM and CJS usage examples

### Technical Details

- Main entry point (`require`): `./dist/cjs/index.js`
- Module entry point (`import`): `./dist/esm/index.js`
- TypeScript types: `./dist/types/index.d.ts`
- Requires Node.js 12.20+ for conditional exports support

### Benefits

- ✅ Modern ESM support for Vite, Rollup, and modern bundlers
- ✅ Tree-shaking support in ESM builds
- ✅ Backward compatible with CommonJS projects
- ✅ Future-proof module architecture
- ✅ Works in both Next.js App Router (ESM) and Pages Router (CJS)

## 1.0.0

### Major Changes

- Production-ready v1.0.0 release with enterprise features:
  - Job timeout & cancellation with AbortController support
  - Priority queue system (HIGH, NORMAL, LOW priorities)
  - Worker health monitoring and automatic restart on failure
  - Real-time metrics and performance monitoring
  - Auto-scaling thread pool with configurable thresholds
  - Strict mode security validation (enabled by default)
  - Comprehensive benchmark suite vs competitors (Piscina, Workerpool, Tinypool)
  - Full TypeScript strict mode with zero linter errors
  - 20+ new comprehensive tests covering all features
  - Complete documentation overhaul (README, SECURITY, CHANGELOG, CONTRIBUTING)
  - Advanced examples for all features
  - Event-driven pool closing (replaced inefficient polling)
  - Enhanced error handling with full stack trace preservation

### Patch Changes

- c546e8a: Add changesets for version management and changelog generation
- cd77166: Update dev dependencies
- 36f33cf: Update repository URL to dwekat/nodeswarm

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-19

### Added

#### Core Features

- **Job Timeout & Cancellation**: Support for job timeouts and cancellation via AbortController
- **Priority Queue System**: HIGH, NORMAL, and LOW priority levels for job scheduling
- **Worker Health Monitoring**: Automatic health checks and worker restart on failure
- **Metrics & Monitoring**: Comprehensive metrics tracking (completed/failed jobs, execution times, queue depth)
- **Auto-scaling**: Optional dynamic pool scaling based on queue depth
- **Strict Mode Validation**: Security validation to detect potentially unsafe code patterns

#### API Enhancements

- Thread options support: `{ timeout, signal, priority }`
- `getMetrics()` method for real-time pool statistics
- `resetMetrics()` method to clear metrics
- Enhanced error handling with full stack trace preservation
- Better TypeScript type inference and constraints

#### Developer Experience

- Comprehensive benchmark suite with 9 different workload types
- Comparison benchmarks against Piscina, Workerpool, and Tinypool
- Example files (basic and advanced usage patterns)
- Full TypeScript strict mode support
- Extensive test coverage for all features

#### Documentation

- Complete SECURITY.md with usage guidelines
- Enhanced README with feature documentation
- API reference with JSDoc comments
- Migration guide for breaking changes

### Changed

#### Breaking Changes

- `thread()` method now supports overloaded signatures with options parameter
- Error messages now include full context (message, stack, name)
- Minimum Node.js version requirement for AbortController support
- TypeScript strict mode enabled (affects type checking)

#### Improvements

- Replaced polling-based `close()` with event-driven approach
- Better error serialization across worker boundary
- More efficient queue management with priority support
- Enhanced worker lifecycle management
- Improved memory efficiency

### Fixed

- Import path bug in worker.ts (`"ThreadPool"` → `"./ThreadPool"`)
- Test bug in high load test (incorrect Array.fill usage)
- Error handling now preserves full error context
- Worker threads properly restart after crashes

### Security

- Input validation for functions and arguments
- Strict mode enabled by default to block unsafe patterns
- Detection of dangerous code patterns (require, eval, process access)
- Comprehensive security documentation

## [0.0.1] - 2024-XX-XX

### Added

- Initial release
- Basic thread pool functionality
- Simple job queue
- Worker thread management
- Basic error handling

---

## Upgrade Guide

### From 0.x to 1.0

#### Thread Method Signature

```typescript
// Old (still supported)
pool.thread((x) => x * 2, 5);

// New with options
pool.thread({ timeout: 1000 }, (x) => x * 2, 5);
pool.thread({ priority: Priority.HIGH }, (x) => x * 2, 5);
```

#### Error Handling

Errors now include full stack traces automatically. No code changes required.

#### Strict Mode

Strict mode is enabled by default. To disable:

```typescript
const pool = new ThreadPool({ strictMode: false });
```

#### Metrics API

```typescript
const metrics = pool.getMetrics();
console.log(metrics.completedJobs, metrics.avgExecutionTime);
```

See [README.md](./README.md) for complete documentation.
