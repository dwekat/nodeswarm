#!/usr/bin/env node
/**
 * Create package.json type hints in dist folders
 */
const fs = require("fs");
const path = require("path");

const cjsPackage = { type: "commonjs" };
const esmPackage = { type: "module" };

const cjsPath = path.join(__dirname, "../dist/cjs/package.json");
const esmPath = path.join(__dirname, "../dist/esm/package.json");

// Ensure directories exist
fs.mkdirSync(path.dirname(cjsPath), { recursive: true });
fs.mkdirSync(path.dirname(esmPath), { recursive: true });

// Write package.json files
fs.writeFileSync(cjsPath, JSON.stringify(cjsPackage, null, 2) + "\n");
fs.writeFileSync(esmPath, JSON.stringify(esmPackage, null, 2) + "\n");

console.log("✓ Created package.json type hints in dist folders");
