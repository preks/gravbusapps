/**
 * Resolves CSS custom properties (variables) to their computed values.
 * Handles SSR gracefully by returning the original value if window/document are unavailable.
 * Supports CSS fallback syntax: var(--token, fallbackValue)
 *
 * @param color - CSS color value (e.g., "var(--nw-primary)" or "destructive")
 * @returns Resolved color value; always returns a string (possibly empty when input is empty)
 *
 * @example
 * resolveCssVar("var(--nw-primary)") // "#1890ff" (example)
 * resolveCssVar("var(--missing, #000)") // "#000"
 * resolveCssVar("destructive") // "destructive"
 */
export const resolveCssVar = (color?: string | null): string => {
  const input = (color ?? '').trim()
  if (!input) return ''

  // Not a CSS variable: return normalized input
  if (!input.startsWith('var(')) return input

  // Extract inside of var(...)
  const inner = input.slice(4, -1).trim()

  // Parse optional fallback: var(--token, fallback)
  let varName = inner
  let fallback: string | undefined

  // Find the first comma not nested in additional parentheses
  let depth = 0
  let commaIndex = -1
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ',' && depth === 0) {
      commaIndex = i
      break
    }
  }

  if (commaIndex !== -1) {
    varName = inner.slice(0, commaIndex).trim()
    fallback = inner.slice(commaIndex + 1).trim()
  }

  // SSR or environments without DOM → return original input (can't resolve),
  // but if we have a fallback, return a normalized fallback instead.
  if (
    globalThis.window === undefined ||
    globalThis.document === undefined ||
    typeof globalThis.window.getComputedStyle !== 'function'
  ) {
    return fallback ? resolveCssVar(fallback) : input
  }

  // Get computed value from document root element
  const resolved = globalThis.window
    .getComputedStyle(globalThis.document.documentElement)
    .getPropertyValue(varName)
    .trim()

  // If unresolved or empty, use fallback if provided; otherwise return original input
  if (!resolved) {
    return fallback ? resolveCssVar(fallback) : input
  }

  return resolved
}
