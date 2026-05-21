export function tryStructuredClone<T>(value: T): T | null {
  if (value == null) return value
  if (typeof structuredClone !== 'function') return null
  try {
    return structuredClone(value)
  } catch {
    return null
  }
}
