/**
 * Utility functions for working with nested object structures
 */

/**
 * Sets a value at a nested path in an object using dot notation
 * @param obj - The object to modify
 * @param path - Dot-notation path (e.g., "investment.name" or "equityInvestment.marketValue")
 * @param value - The value to set
 * 
 * @example
 * const obj = {};
 * setNestedValue(obj, "investment.name", "Test");
 * // obj is now { investment: { name: "Test" } }
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
};

