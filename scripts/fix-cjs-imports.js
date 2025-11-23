#!/usr/bin/env node
/**
 * Fix import.meta references in CJS build
 * Replaces the ESM path code with a throw statement since it's unreachable
 */
const fs = require("fs");
const path = require("path");

const threadPoolPath = path.join(__dirname, "../dist/cjs/ThreadPool.js");

let content = fs.readFileSync(threadPoolPath, "utf8");

// Replace the import.meta.url line with a throw
// This code is unreachable in CJS (guarded by __dirname check)
// but Node still parses it and throws syntax error
content = content.replace(
  /const url = new URL\("\.\/worker\.js", import\.meta\.url\);/g,
  'throw new Error("This code path should never execute in CommonJS");'
);

fs.writeFileSync(threadPoolPath, content, "utf8");
console.log("✓ Fixed import.meta references in CJS build");
