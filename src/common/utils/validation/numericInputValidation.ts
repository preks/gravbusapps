/**
 * Input validation utilities following Single Responsibility Principle
 * Each function has one specific validation concern
 *
 * Shared utility for validating numeric inputs across the application
 * Used by: Expenses, HR Salaries, Bonuses, etc.
 */

export interface ValidationResult {
  isValid: boolean
  cleanedValue: string
  error?: string
}

export interface KeyValidationResult {
  isAllowed: boolean
  shouldPreventDefault: boolean
}

/**
 * Validates if a key press should be allowed
 * Follows Single Responsibility Principle
 */
export const validateKeyPress = (
  e: React.KeyboardEvent<HTMLInputElement>,
  options: { allowNegative?: boolean } = {}
): KeyValidationResult => {
  const { allowNegative = false } = options

  // Control keys (always allowed)
  const controlKeys = ['Backspace', 'Tab', 'Escape', 'Enter', 'Delete']
  if (controlKeys.includes(e.key)) {
    return { isAllowed: true, shouldPreventDefault: false }
  }

  // Keyboard shortcuts (always allowed)
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
    return { isAllowed: true, shouldPreventDefault: false }
  }

  // Navigation keys (always allowed)
  const navigationKeys = ['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  if (navigationKeys.includes(e.key)) {
    return { isAllowed: true, shouldPreventDefault: false }
  }

  // Numbers (0-9) from main keyboard and numpad
  if (/^\d$/.test(e.key)) {
    return { isAllowed: true, shouldPreventDefault: false }
  }

  // Decimal point (conditional)
  if (e.key === '.') {
    return { isAllowed: true, shouldPreventDefault: false } // Let change handler decide
  }

  // Minus sign (conditional - let change handler enforce validity)
  if (e.key === '-' && allowNegative) {
    return { isAllowed: true, shouldPreventDefault: false }
  }

  // Block everything else
  return { isAllowed: false, shouldPreventDefault: true }
}

/**
 * Helper: Normalizes negative signs (only one at start)
 */
const normalizeNegativeSign = (value: string, currentValue: string, allowNegative: boolean): string => {
  if (!allowNegative || !value.includes('-')) {
    return value
  }

  const minusCount = (value.match(/-/g) || []).length
  if (minusCount > 1 || value.indexOf('-') > 0) {
    let cleaned = value.replace(/-/g, '')
    if (currentValue.startsWith('-')) {
      cleaned = '-' + cleaned
    }
    return cleaned
  }

  return value
}

/**
 * Helper: Normalizes decimal points (only one allowed)
 */
const normalizeDecimalPoint = (value: string): string => {
  const decimalCount = (value.match(/\./g) || []).length
  if (decimalCount <= 1) {
    return value
  }

  const firstDecimalIndex = value.indexOf('.')
  return value.substring(0, firstDecimalIndex + 1) + value.substring(firstDecimalIndex + 1).replace(/\./g, '')
}

/**
 * Helper: Limits decimal places
 */
const limitDecimalPlaces = (value: string, maxDecimals: number): string => {
  if (!value.includes('.')) {
    return value
  }

  const parts = value.split('.')
  if (parts[1] && parts[1].length > maxDecimals) {
    return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
  }

  return value
}

/**
 * Helper: Removes leading zeros
 */
const removeLeadingZeros = (value: string): string => {
  const hasNegativeSign = value.startsWith('-')
  const sign = hasNegativeSign ? '-' : ''
  let core = hasNegativeSign ? value.substring(1) : value

  if (core.includes('.')) {
    core = core.replace(/^0+/, '')
    if (core === '' || core.startsWith('.')) {
      core = '0' + core
    }
  } else {
    core = core.replace(/^0+/, '') || '0'
  }

  return sign + core
}

/**
 * Helper: Validates numeric range
 */
const validateRange = (
  value: string,
  maxValue: number | undefined,
  minValue: number | undefined
): ValidationResult | null => {
  const numericValue = Number.parseFloat(value)
  if (Number.isNaN(numericValue)) {
    return null
  }

  if (maxValue !== undefined && numericValue > maxValue) {
    return {
      isValid: false,
      cleanedValue: value,
      error: `Value cannot exceed ${maxValue}`
    }
  }

  if (minValue !== undefined && numericValue < minValue) {
    return {
      isValid: false,
      cleanedValue: value,
      error: `Value cannot be less than ${minValue}`
    }
  }

  return null
}

/**
 * Validates and cleans numeric input
 * Follows Single Responsibility Principle
 */
export const validateNumericInput = (
  value: string,
  currentValue: string = '',
  options: {
    maxDecimals?: number
    allowNegative?: boolean
    maxValue?: number
    minValue?: number
  } = {}
): ValidationResult => {
  const { maxDecimals = 2, allowNegative = false, maxValue, minValue } = options

  // Remove non-numeric characters (except decimal and minus)
  const pattern = allowNegative ? /[^\d.-]/g : /[^\d.]/g
  let cleanValue = value.replace(pattern, '')

  // Apply normalization steps
  cleanValue = normalizeNegativeSign(cleanValue, currentValue, allowNegative)
  cleanValue = normalizeDecimalPoint(cleanValue)
  cleanValue = limitDecimalPlaces(cleanValue, maxDecimals)
  cleanValue = removeLeadingZeros(cleanValue)

  // Validate range
  const rangeError = validateRange(cleanValue, maxValue, minValue)
  if (rangeError) {
    return rangeError
  }

  return {
    isValid: true,
    cleanedValue: cleanValue
  }
}

/**
 * Validates and cleans pasted content
 * Follows Single Responsibility Principle
 */
export const validatePastedContent = (
  pastedText: string,
  currentValue: string,
  options: {
    maxDecimals?: number
    allowNegative?: boolean
    maxValue?: number
    minValue?: number
  } = {}
): ValidationResult => {
  const { maxValue, minValue } = options

  // Clean the pasted content first
  const pattern = options.allowNegative ? /[^\d.-]/g : /[^\d.]/g
  const cleanPasteData = pastedText.replace(pattern, '')

  if (!cleanPasteData) {
    return {
      isValid: false,
      cleanedValue: '',
      error: 'No valid numeric content to paste'
    }
  }

  // Check decimal point conflicts
  const currentHasDecimal = currentValue.includes('.')
  const pasteHasDecimal = cleanPasteData.includes('.')

  let finalPasteData = cleanPasteData

  if (currentHasDecimal && pasteHasDecimal) {
    finalPasteData = cleanPasteData.replace(/\./g, '')
  }

  // Validate range for the pasted content
  const rangeError = validateRange(finalPasteData, maxValue, minValue)
  if (rangeError) {
    return rangeError
  }

  return {
    isValid: true,
    cleanedValue: finalPasteData
  }
}
