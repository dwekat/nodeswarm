# Contributing to NodeSwarm

Thank you for your interest in contributing to NodeSwarm! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build great software together.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating an issue
3. **Include**:
   - NodeSwarm version
   - Node.js version
   - Operating system
   - Minimal reproduction code
   - Expected vs actual behavior
   - Error messages and stack traces

### Suggesting Features

1. **Check existing feature requests** first
2. **Open an issue** with:
   - Clear use case description
   - Why this feature would be valuable
   - Proposed API if applicable
   - Willingness to implement it

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Run benchmarks** if performance-related: `npm run benchmark`
7. **Commit with clear messages**: `git commit -m "Add feature X"`
8. **Push to your fork**: `git push origin feature/my-feature`
9. **Create a Pull Request**

## Development Setup

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm, yarn, or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/mdwekat/nodeswarm.git
cd nodeswarm

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run benchmarks
npm run benchmark
```

## Project Structure

```
nodeswarm/
├── src/              # Source code
│   ├── index.ts      # Main exports
│   ├── ThreadPool.ts # Core thread pool implementation
│   ├── worker.ts     # Worker thread logic
│   ├── types.ts      # Type definitions
│   ├── metrics.ts    # Metrics tracking
│   ├── priorityQueue.ts # Priority queue implementation
│   └── validation.ts # Security validation
├── test/             # Test files
├── benchmark/        # Benchmark suite
├── examples/         # Usage examples
└── dist/             # Compiled output
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide proper type annotations
- No `any` types without justification
- Use interfaces for public APIs

### Code Style

- Line length: 80 characters max
- Indentation: 2 spaces
- Use Prettier for formatting
- Follow existing code patterns

### Comments

- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up to date
- Add comments for complex logic

### Example

```typescript
/**
 * Executes a function in a worker thread with options.
 *
 * @param options - Execution options (timeout, priority, signal)
 * @param fn - Function to execute
 * @param args - Arguments to pass to the function
 * @returns Promise resolving to function result
 * @throws Error if validation fails or execution times out
 */
thread<R>(
  options: ThreadOptions,
  fn: (...args: any[]) => R,
  ...args: any[]
): Promise<R> {
  // Implementation
}
```

## Testing Guidelines

### Writing Tests

- Test files use `.test.ts` extension
- One test file per source file
- Use descriptive test names
- Test both success and failure cases
- Test edge cases

### Test Structure

```typescript
describe("Feature", () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  afterEach(async () => {
    await pool.close();
  });

  it("should do something", async () => {
    const result = await pool.thread(() => 42);
    expect(result).toBe(42);
  });

  it("should handle errors", async () => {
    await expect(
      pool.thread(() => { throw new Error("test"); })
    ).rejects.toThrow("test");
  });
});
```

### Running Tests

```bash
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage
```

## Benchmarking

When making performance-related changes:

1. Run benchmarks before changes: `npm run benchmark`
2. Make your changes
3. Run benchmarks after: `npm run benchmark`
4. Compare results
5. Include benchmark results in PR description

## Documentation

### README Updates

- Update README.md for new features
- Add examples for new APIs
- Update performance numbers if changed

### Changelog

- Add entry to CHANGELOG.md
- Follow Keep a Changelog format
- Include migration guide for breaking changes

### Security

- Update SECURITY.md for security-related changes
- Document new security considerations

## Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(pool): add job cancellation with AbortController

Implement AbortController support for cancelling jobs.
Jobs can now be cancelled mid-execution.

Closes #123
```

```
fix(worker): preserve error stack traces

Worker errors now include full stack traces for better debugging.
```

## Release Process

(For maintainers)

1. Update version in package.json
2. Update CHANGELOG.md
3. Commit: `chore: release v1.0.0`
4. Tag: `git tag v1.0.0`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

Using changesets:

```bash
npm run changeset      # Create changeset
npm run version        # Update versions
npm run release        # Publish to npm
```

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an issue
- **Security**: Email mudwekat@gmail.com
- **Chat**: (Add Discord/Slack link if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Special thanks in README for significant contributions

Thank you for contributing to NodeSwarm! 🚀

