# Changelog

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
