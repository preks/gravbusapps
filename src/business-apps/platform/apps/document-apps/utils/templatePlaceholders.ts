/**
 * Resolve {{entityType.fieldPath}} placeholders in template content
 * using entity data (e.g. job candidate). Supports nested paths like
 * jobCandidate.address.locality.
 */

/**
 * Get a value from an object by dot-separated path (e.g. "address.locality").
 */
function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * Replace {{entityType.fieldPath}} placeholders in content with values from data.
 * Entity type in the placeholder must match (e.g. jobCandidate); other placeholders are left as-is.
 */
export function resolvePlaceholders(content: string, entityType: string, data: Record<string, unknown>): string {
  const prefix = `{{${entityType}.`
  const suffix = '}}'
  let result = content
  const regex = new RegExp(`${escapeRegex(prefix)}([^}]+)${escapeRegex(suffix)}`, 'g')
  result = result.replace(regex, (_, path: string) => {
    const value = getByPath(data, path.trim())
    if (value === undefined || value === null) return ''
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      return typeof (value as { displayName?: string }).displayName === 'string'
        ? (value as { displayName: string }).displayName
        : JSON.stringify(value)
    }
    return String(value)
  })
  return result
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
