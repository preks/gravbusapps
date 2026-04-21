/**
 * Sanitizes an `additionalProperties` object by dropping keys with empty
 * values. Returns `undefined` when the object ends up empty so callers can
 * omit the key entirely from the submission payload.
 */

export function sanitizeAdditionalProperties(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  return Object.keys(result).length > 0 ? result : undefined
}
