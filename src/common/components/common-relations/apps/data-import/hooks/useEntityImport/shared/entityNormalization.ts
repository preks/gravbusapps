/**
 * Shared entity normalization helpers used before a record is submitted to the
 * backend. These are pure and domain-agnostic — they operate on plain objects
 * extracted by the flowbot pipeline regardless of whether the import is a CRM
 * or IRM flow.
 */

export function stripEmptyValues<T extends Record<string, any>>(entity: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => {
      if (value === null || value === undefined || value === '') return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object') return Object.keys(value).length > 0
      return true
    })
  ) as Partial<T>
}

export function parseJsonObjectString(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.startsWith('{')) return value
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null ? parsed : value
  } catch {
    return value
  }
}

/**
 * Flowbot extraction may return `addressLine` values as JSON strings; Java
 * import endpoints expect an object (e.g. `{ lines: [...] }`). This helper
 * parses those strings back into objects at both the root level, within any
 * `addresses[]` array, and within an investment sub-segment (`investment` or
 * any `*Investment` payload key).
 */
export function normalizeEntityForImport<T extends Record<string, any>>(entity: T): T {
  const normalized: T = { ...entity }
  const target = normalized as Record<string, any>

  if ('addressLine' in target) {
    target.addressLine = parseJsonObjectString(target.addressLine)
  }

  if (Array.isArray(target.addresses)) {
    target.addresses = target.addresses.map((addr: Record<string, unknown>) => ({
      ...addr,
      addressLine: parseJsonObjectString(addr.addressLine)
    }))
  }

  for (const [segment, segmentValue] of Object.entries(target)) {
    if (segment !== 'investment' && !segment.endsWith('Investment')) {
      continue
    }
    if (!segmentValue || typeof segmentValue !== 'object' || Array.isArray(segmentValue)) {
      continue
    }
    target[segment] = {
      ...segmentValue,
      addressLine: parseJsonObjectString((segmentValue as Record<string, unknown>).addressLine)
    }
  }

  return normalized
}
