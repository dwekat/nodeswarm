import { ThreadPool } from '../dist/esm/index.js';
import assert from 'assert';

console.log('Running ESM compatibility test...');

const pool = new ThreadPool();

try {
  const result = await pool.thread((a, b) => a + b, 2, 3);
  assert.strictEqual(result, 5, 'Expected 2 + 3 = 5');
  console.log('✓ ESM compatibility test passed');
  process.exit(0);
} catch (error) {
  console.error('✗ ESM compatibility test failed:', error);
  process.exit(1);
} finally {
  await pool.close();
}

