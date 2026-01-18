/**
 * Parse save error and return appropriate user-friendly message
 * Returns undefined if no specific error message should be shown (use generic toast)
 */
export const parseAllowanceSetupSaveError = (err: unknown): string | undefined => {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error'

  if (errorMessage.includes('DateTimeParseException') || errorMessage.includes('Instant')) {
    return 'Invalid date format. Please check the validity dates.'
  }

  if (errorMessage.includes('activeFrom') || errorMessage.includes('validFrom')) {
    return 'Invalid Valid From date. Please check the date format.'
  }

  if (errorMessage.includes('activeTo') || errorMessage.includes('validTo')) {
    return 'Invalid Valid To date. Please check the date format.'
  }

  return undefined
}

/**
 * Get error message for code uniqueness check failure
 */
export const getCodeUniquenessErrorMessage = (existingName?: string): string => {
  if (existingName) {
    return 'This code already exists with an overlapping validity period. Please use a different code or adjust the validity dates.'
  }
  return 'Unable to verify code uniqueness. Please check your connection and try again. If the problem persists, contact support.'
}
