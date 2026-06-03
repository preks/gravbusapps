/**
 * Safe string coercion for loose GraphQL/REST `Record<string, unknown>` rows.
 * Avoids `String(object)` → `[object Object]` (Sonar S6551).
 */
export function graphqlUnknownToString(value: unknown): string {
  if (value == null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

/** Like {@link graphqlUnknownToString} but returns `null` when there is no scalar string to use. */
export function graphqlUnknownToStringOrNull(value: unknown): string | null {
  if (value == null) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return null
}
