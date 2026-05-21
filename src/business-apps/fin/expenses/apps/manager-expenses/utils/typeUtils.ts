/**
 * Formats a type label by capitalizing the first letter and lowercasing the rest
 * @param value - The value to format
 * @returns Formatted label or 'N/A' if value is empty
 */
export const formatTypeLabel = (value?: string | null): string => {
  if (value === null || value === undefined) return 'N/A'
  const trimmed = String(value).trim()
  if (!trimmed || trimmed.toUpperCase() === 'N/A') return 'N/A'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/**
 * Translates a request/plan type value using manager-expenses Fluent (`t`).
 * Handles both raw values and catalog references (e.g., "ExpenseRequestType:v1:TRIP").
 */
export const translateTypeValue = (raw: string | null | undefined, t: (key: string) => string): string => {
  const na = () => t('expense-details-value-not-available')
  if (!raw) return na()

  const code = raw.includes(':') ? raw.split(':').pop()?.toUpperCase() : raw.toUpperCase()

  switch (code) {
    case 'TRIP':
      return t('expense-plans-filter-type-trip')
    case 'EXPENSE':
    case 'EXPENSES':
      return t('expense-plans-filter-type-expense')
    default: {
      const formatted = formatTypeLabel(raw)
      return formatted === 'N/A' ? na() : formatted
    }
  }
}

/**
 * Extracts the request type value from a requestType object (with translations) or string
 * @param requestType - The requestType object or string
 * @returns The type value or undefined
 */
export const extractRequestTypeValue = (requestType?: { value?: string } | string | null): string | undefined => {
  if (!requestType) return undefined
  if (typeof requestType === 'string') return requestType
  return requestType.value
}
