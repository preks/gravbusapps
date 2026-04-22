/**
 * The CRM lead endpoint expects `addressLine` as a plain string, while IRM
 * lead endpoints expect a structured object (`{ lines: [...] }`). This helper
 * coerces either shape into the string form the CRM endpoint accepts, or
 * returns `undefined` when no usable value is present.
 */

export function toLeadAddressLineString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const lines = (value as { lines?: unknown }).lines
  if (!Array.isArray(lines) || lines.length === 0) return undefined
  const firstLine = lines[0]
  return typeof firstLine === 'string' ? firstLine : undefined
}
