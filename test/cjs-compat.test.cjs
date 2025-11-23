const { ThreadPool } = require('../dist/cjs/index.js');
const assert = require('assert');

console.log('Running CJS compatibility test...');

(async () => {
  const pool = new ThreadPool();
  
  try {
    const result = await pool.thread((a, b) => a + b, 2, 3);
    assert.strictEqual(result, 5, 'Expected 2 + 3 = 5');
    console.log('✓ CJS compatibility test passed');
    process.exit(0);
  } catch (error) {
    console.error('✗ CJS compatibility test failed:', error);
    process.exit(1);
  } finally {
    await pool.close();
  }
})();

