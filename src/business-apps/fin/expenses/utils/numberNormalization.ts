/**
 * Utilities to normalize locale-formatted numeric strings to numbers
 */

/**
 * Convert a localized numeric string (e.g. "1.234,56" or "1,234.56" or "20,00") to a number.
 * If the string does not look like a number, return it unchanged.
 */
export const toNumberIfNumericString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const input = value.trim()
  if (!input) return value

  // Accept patterns like:
  // - 1234
  // - 1,234
  // - 1.234
  // - 1,234.56
  // - 1.234,56
  // - 20,00
  const numericLikePattern = /^-?\d{1,3}([.,]\d{3})*([.,]\d{1,2})?$|^-?\d+([.,]\d{1,2})?$/
  if (!numericLikePattern.test(input)) {
    return value
  }

  // Determine rightmost separator and treat it as decimal if followed by 1-2 digits
  const lastComma = input.lastIndexOf(',')
  const lastDot = input.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)

  let normalized = input
  if (lastSep > -1) {
    const fractional = input.substring(lastSep + 1)
    const isDecimal = /^\d{1,2}$/.test(fractional)
    if (isDecimal) {
      const before = input.substring(0, lastSep).replace(/[.,]/g, '')
      normalized = `${before}.${fractional}`
    } else {
      normalized = input.replace(/[.,]/g, '')
    }
  }

  const num = Number.parseFloat(normalized)
  return Number.isNaN(num) ? value : num
}

/**
 * Recursively traverse an object/array and convert any localized numeric strings to numbers.
 */
export const deepNormalizeNumericStrings = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data.map(item => deepNormalizeNumericStrings(item)) as T
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== null && typeof v === 'object') {
        result[k] = deepNormalizeNumericStrings(v)
      } else {
        result[k] = toNumberIfNumericString(v)
      }
    })
    return result as T
  }
  // primitive
  return toNumberIfNumericString(data) as T
}
