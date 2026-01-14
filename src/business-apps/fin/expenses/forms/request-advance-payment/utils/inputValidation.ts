/**
 * Input validation utilities following Single Responsibility Principle
 * Each function has one specific validation concern
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

  // Handle negative sign (only at start)
  if (allowNegative && cleanValue.includes('-')) {
    const minusCount = (cleanValue.match(/-/g) || []).length
    if (minusCount > 1 || cleanValue.indexOf('-') > 0) {
      cleanValue = cleanValue.replace(/-/g, '')
      if (currentValue.startsWith('-')) {
        cleanValue = '-' + cleanValue
      }
    }
  }

  // Handle decimal points (only one allowed)
  const decimalCount = (cleanValue.match(/\./g) || []).length
  if (decimalCount > 1) {
    const firstDecimalIndex = cleanValue.indexOf('.')
    cleanValue =
      cleanValue.substring(0, firstDecimalIndex + 1) + cleanValue.substring(firstDecimalIndex + 1).replace(/\./g, '')
  }

  // Limit decimal places
  if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.')
    if (parts[1] && parts[1].length > maxDecimals) {
      cleanValue = `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
    }
  }

  // Remove leading zeros (except for decimal values)
  if (cleanValue.length > 1 && cleanValue[0] === '0' && cleanValue[1] !== '.') {
    cleanValue = cleanValue.substring(1)
  }

  // Validate range
  const numericValue = parseFloat(cleanValue)
  if (!isNaN(numericValue)) {
    if (maxValue !== undefined && numericValue > maxValue) {
      return {
        isValid: false,
        cleanedValue: cleanValue,
        error: `Value cannot exceed ${maxValue}`
      }
    }
    if (minValue !== undefined && numericValue < minValue) {
      return {
        isValid: false,
        cleanedValue: cleanValue,
        error: `Value cannot be less than ${minValue}`
      }
    }
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
  const numericValue = parseFloat(finalPasteData)
  if (!isNaN(numericValue)) {
    if (maxValue !== undefined && numericValue > maxValue) {
      return {
        isValid: false,
        cleanedValue: finalPasteData,
        error: `Value cannot exceed ${maxValue}`
      }
    }
    if (minValue !== undefined && numericValue < minValue) {
      return {
        isValid: false,
        cleanedValue: finalPasteData,
        error: `Value cannot be less than ${minValue}`
      }
    }
  }

  return {
    isValid: true,
    cleanedValue: finalPasteData
  }
}
