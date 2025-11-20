/**
 * Security validation utilities for function serialization
 */

// Patterns that could indicate potentially dangerous code
const DANGEROUS_PATTERNS = [
  /require\s*\(/i,
  /import\s+/i,
  /eval\s*\(/i,
  /Function\s*\(/i,
  /process\./i,
  /global\./i,
  /__dirname/i,
  /__filename/i,
  /child_process/i,
  /fs\./i,
];

/**
 * Validates a function before serialization
 * Checks for potentially dangerous patterns
 *
 * @param fn - The function to validate
 * @throws Error if validation fails
 */
export function validateFunction(fn: Function): void {
  if (typeof fn !== "function") {
    throw new Error("Input must be a function");
  }

  const fnString = fn.toString();

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fnString)) {
      throw new Error(
        `Function contains potentially unsafe code pattern: ${pattern}`
      );
    }
  }

  // Check for arrow functions and regular functions
  const isArrowFunction = fnString.includes("=>");
  const isFunctionKeyword =
    fnString.startsWith("function") || fnString.startsWith("async function");

  if (!isArrowFunction && !isFunctionKeyword) {
    throw new Error("Invalid function format");
  }
}

/**
 * Checks if a value is serializable for worker communication
 *
 * @param value - The value to check
 * @returns true if serializable, false otherwise
 */
export function isSerializable(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  const type = typeof value;

  // Primitives are serializable
  if (
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "bigint"
  ) {
    return true;
  }

  // Functions, symbols are not serializable
  if (type === "function" || type === "symbol") {
    return false;
  }

  // Check arrays
  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }

  // Check plain objects
  if (type === "object") {
    // Check for special objects that aren't serializable
    if (
      value instanceof RegExp ||
      value instanceof Error ||
      value instanceof Date ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof WeakMap ||
      value instanceof WeakSet
    ) {
      return false;
    }

    // Check all properties
    try {
      return Object.values(value).every(isSerializable);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Validates function arguments for serializability
 *
 * @param args - Arguments to validate
 * @throws Error if any argument is not serializable
 */
export function validateArguments(args: any[]): void {
  for (let i = 0; i < args.length; i++) {
    if (!isSerializable(args[i])) {
      throw new Error(
        `Argument at index ${i} is not serializable. ` +
          `Worker threads can only accept primitive types and ` +
          `plain objects/arrays.`
      );
    }
  }
}

