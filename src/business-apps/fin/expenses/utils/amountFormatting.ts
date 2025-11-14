import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

/**
 * Parses a numeric value from various input formats
 * @param value - The value to parse (can be number or string with comma/period separators)
 * @returns The parsed number or null if invalid
 */
export const parseNumericValue = (value: any): number | null => {
  if (typeof value === 'number') return value
  const input = String(value).trim()
  if (!input) return null

  // Accept common locale formats and determine decimal separator using last occurrence
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

  const parsed = Number.parseFloat(normalized)
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : null
}

/**
 * Formats a number value according to the current locale
 * @param numValue - The numeric value to format
 * @returns The formatted string with proper decimal/thousands separators for the locale
 */
export const formatAmountForLocale = (numValue: number): string => {
  const locale = getCurrentActiveUserLocale() || 'en-US'
  const platformFormatted = formatNumberFunction(String(numValue), '0,0.00')
  const intlFormatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue)
  return platformFormatted && platformFormatted !== String(numValue) ? platformFormatted : intlFormatted
}

/**
 * Parses and formats an amount value, handling various decimal separator formats
 * Supports both comma (,) and period (.) as decimal separators
 * Intelligently distinguishes between thousands and decimal separators
 *
 * @param valueStr - The string value to parse and format
 * @returns Object with parsed numeric value and formatted display string, or null if invalid
 */
export const parseAndFormatAmount = (valueStr: string): { numValue: number; formattedValue: string } | null => {
  const trimmed = valueStr.trim()
  if (!trimmed) return null

  // Remove non-numeric characters except decimal separators (both . and ,)
  let cleaned = trimmed.replace(/[^0-9,.-]/g, '')

  // Find the last occurrence of . or ,
  const lastCommaIndex = cleaned.lastIndexOf(',')
  const lastPeriodIndex = cleaned.lastIndexOf('.')
  const lastSepIndex = Math.max(lastCommaIndex, lastPeriodIndex)

  // If we have separators, the rightmost one is the decimal separator
  if (lastSepIndex > -1) {
    // Check if it's followed by 1-2 digits (typical decimal pattern)
    const afterSep = cleaned.substring(lastSepIndex + 1)
    const isDecimalSeparator = /^\d{1,2}$/.test(afterSep)

    if (isDecimalSeparator) {
      // This is the decimal separator - convert to period and remove all others
      const beforeDecimal = cleaned.substring(0, lastSepIndex).replace(/[.,]/g, '')
      const afterDecimal = afterSep
      cleaned = `${beforeDecimal}.${afterDecimal}`
    } else {
      // No clear decimal separator, remove all
      cleaned = cleaned.replace(/[.,]/g, '')
    }
  }

  const numValue = Number.parseFloat(cleaned)
  if (Number.isNaN(numValue)) {
    return null
  }

  const formattedValue = formatAmountForLocale(numValue)

  return { numValue, formattedValue }
}

/**
 * Recursively traverse an object/array and convert any localized numeric strings to numbers.
 * Useful for normalizing payloads before submission.
 */
export const deepNormalizeNumericStrings = (data: any): any => {
  const toNumberIfNumericString = (v: unknown): unknown => {
    if (typeof v !== 'string') return v
    const s = v.trim()
    if (!s) return v
    const numericLikePattern = /^-?\d{1,3}([.,]\d{3})*([.,]\d{1,2})?$|^-?\d+([.,]\d{1,2})?$/
    if (!numericLikePattern.test(s)) return v

    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    const lastSep = Math.max(lastComma, lastDot)

    let normalized = s
    if (lastSep > -1) {
      const fractional = s.substring(lastSep + 1)
      const isDecimal = /^\d{1,2}$/.test(fractional)
      if (isDecimal) {
        const before = s.substring(0, lastSep).replace(/[.,]/g, '')
        normalized = `${before}.${fractional}`
      } else {
        normalized = s.replace(/[.,]/g, '')
      }
    }

    const num = Number.parseFloat(normalized)
    return Number.isNaN(num) ? v : num
  }

  if (Array.isArray(data)) {
    return data.map(item => deepNormalizeNumericStrings(item))
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
    return result
  }
  return toNumberIfNumericString(data)
}
