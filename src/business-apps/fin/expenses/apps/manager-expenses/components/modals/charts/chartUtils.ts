/**
 * Resolves CSS custom properties (variables) to their computed values.
 * Handles SSR gracefully by returning the original value if window/document are unavailable.
 * 
 * @param color - CSS color value (e.g., "var(--nw-primary)" or "#ff0000")
 * @returns Resolved color value or original color if not a CSS variable
 * 
 * @example
 * resolveCssVar("var(--nw-primary)") // Returns "#1890ff" (or whatever the computed value is)
 * resolveCssVar("#ff0000") // Returns "#ff0000" (unchanged)
 */
export const resolveCssVar = (color: string): string => {
  // Return early if not a CSS variable
  if (!color?.startsWith('var(')) return color;
  
  // Handle SSR or environments without DOM
  if (
    typeof globalThis.window === 'undefined' ||
    typeof globalThis.document === 'undefined' ||
    typeof globalThis.window.getComputedStyle !== 'function'
  ) {
    return color;
  }
  
  // Extract variable name from "var(--name)" format
  const varName = color.substring(4, color.length - 1).trim();
  
  // Get computed value from document root element
  const value = globalThis.window
    .getComputedStyle(globalThis.document.documentElement)
    .getPropertyValue(varName)
    .trim();
  
  // Return computed value or fallback to original if not found
  return value || color;
};
