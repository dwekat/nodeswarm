# Security Policy

## Overview

NodeSwarm uses function serialization to execute code in worker threads. While this provides flexibility, it requires careful consideration of security implications.

## Security Considerations

### Function Serialization and eval()

NodeSwarm internally uses `new Function()` (similar to `eval()`) to deserialize and execute functions in worker threads. This is a deliberate design choice to enable dynamic function execution but comes with important security implications.

**⚠️ CRITICAL: Never use NodeSwarm with untrusted or user-provided code.**

### Safe Usage Guidelines

#### ✅ SAFE - Your Own Code

```typescript
const pool = new ThreadPool();

// Safe: Your own, reviewed function
await pool.thread((x, y) => x + y, 5, 10);

// Safe: Your own CPU-intensive logic
await pool.thread((n) => {
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.sqrt(i);
  }
  return result;
}, 1000000);
```

#### ❌ UNSAFE - User Input or Untrusted Code

```typescript
// DANGEROUS: Never do this!
const userFunction = request.body.code; // User-provided code
await pool.thread(eval(userFunction)); // SEVERE SECURITY RISK

// DANGEROUS: Dynamic function from external source
const externalCode = await fetch("untrusted-source.com/code.js");
await pool.thread(externalCode); // SEVERE SECURITY RISK

// DANGEROUS: Unvalidated user input as arguments
await pool.thread(
  (code) => eval(code), // Allows arbitrary code execution
  userInput
);
```

### Strict Mode (Recommended)

NodeSwarm enables strict mode by default, which performs validation checks on functions before execution:

```typescript
const pool = new ThreadPool({ strictMode: true }); // Default

// This will throw an error due to security validation
try {
  await pool.thread(() => {
    require('fs').readFileSync('/etc/passwd'); // Blocked!
  });
} catch (error) {
  console.error('Security validation failed:', error);
}
```

Strict mode detects and blocks:
- `require()` and `import` statements
- `eval()` and `Function()` constructor calls
- Access to `process`, `global`, `__dirname`, `__filename`
- File system and child process operations

### Disabling Strict Mode

Only disable strict mode if you have a specific need and understand the risks:

```typescript
const pool = new ThreadPool({ strictMode: false });
```

## Best Practices

1. **Code Review**: Always review functions passed to `pool.thread()`
2. **Input Validation**: Validate all arguments passed to worker functions
3. **Principle of Least Privilege**: Only pass necessary data to workers
4. **Audit Dependencies**: Ensure your codebase doesn't pass untrusted code
5. **Environment Isolation**: Run NodeSwarm in isolated environments for additional security

## Limitations

### What NodeSwarm Cannot Protect Against

- **Supply Chain Attacks**: Compromised dependencies in your codebase
- **Code Injection**: If your application logic allows untrusted code execution
- **Privilege Escalation**: Running NodeSwarm with elevated privileges

### Serialization Constraints

Worker threads can only receive serializable data:

```typescript
// ✅ Serializable: primitives, plain objects, arrays
await pool.thread((data) => data.length, [1, 2, 3]);
await pool.thread((obj) => obj.value, { value: 42 });

// ❌ Not serializable: functions, symbols, class instances
await pool.thread((fn) => fn(), () => {}); // Will fail
await pool.thread((map) => map.size, new Map()); // Will fail
```

## Reporting Security Issues

If you discover a security vulnerability in NodeSwarm, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer at: mudwekat@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work on a fix as quickly as possible.

## Security Updates

- Security patches are released as soon as possible
- Check the [CHANGELOG.md](./CHANGELOG.md) for security-related updates
- Subscribe to release notifications on GitHub

## Additional Resources

- [Node.js Worker Threads Security](https://nodejs.org/api/worker_threads.html#worker_threads_worker_threads)
- [OWASP Code Injection](https://owasp.org/www-community/attacks/Code_Injection)
- [Secure Coding Practices](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

## Version Support

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.x.x   | :x:                |

## License

This security policy is part of the NodeSwarm project and is licensed under the MIT License.

