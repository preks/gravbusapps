/**
 * Normalizes date range filter values from UI components to From/To format
 * Handles both string (comma-separated) and array formats
 */
export const normalizeDateRange = (
  value: string | string[] | undefined | null
): { from?: string; to?: string } | null => {
  if (!value) return null

  let start: string | undefined
  let end: string | undefined

  if (Array.isArray(value)) {
    if (value.length >= 2) {
      start = value[0] || undefined
      end = value[1] || undefined
    } else if (value.length === 1) {
      start = value[0] || undefined
    }
  } else if (typeof value === 'string') {
    const parts = value
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      start = parts[0] || undefined
      end = parts[1] || undefined
    } else if (parts.length === 1) {
      start = parts[0] || undefined
    }
  }

  if (!start && !end) return null

  return { from: start, to: end }
}
