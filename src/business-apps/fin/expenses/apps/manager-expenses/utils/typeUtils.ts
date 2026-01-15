import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
 * Translates a request/plan type value to a user-friendly label
 * Handles both raw values and catalog references (e.g., "ExpenseRequestType:v1:TRIP")
 * @param raw - The raw type value
 * @returns Translated label or formatted value
 */
export const translateTypeValue = (raw?: string | null): string => {
  if (!raw) return 'N/A'

  // Extract the type code from catalog reference format (e.g., "ExpenseRequestType:v1:TRIP" -> "TRIP")
  const code = raw.includes(':') ? raw.split(':').pop()?.toUpperCase() : raw.toUpperCase()

  switch (code) {
    case 'TRIP':
      return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
    case 'EXPENSE':
    case 'EXPENSES':
      return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
    default:
      return formatTypeLabel(raw)
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
