import dayjs from 'dayjs'

export interface SetupDateValidationError {
  message: string
}

/**
 * Validates allowance setup dates against rule dates
 * Returns error message if invalid, null if valid
 */
export const validateAllowanceSetupDates = (
  activeFrom: string | undefined,
  activeTo: string | undefined,
  ruleActiveFrom: string,
  ruleActiveTo?: string
): SetupDateValidationError | null => {
  if (!activeFrom) {
    return { message: 'Valid From date is required' }
  }

  const ruleFrom = dayjs(ruleActiveFrom)
  const ruleTo = ruleActiveTo ? dayjs(ruleActiveTo) : null
  const setupFrom = dayjs(activeFrom)
  const setupTo = activeTo ? dayjs(activeTo) : null

  // Valid From must be on or after rule's start date
  if (setupFrom.isBefore(ruleFrom, 'day')) {
    return {
      message: `Valid From must be on or after ${ruleFrom.format('DD/MM/YYYY')} (rule start date)`
    }
  }

  // Valid To must be on or before rule's end date
  if (ruleTo?.isAfter && setupTo?.isAfter(ruleTo, 'day')) {
    return {
      message: `Valid To must be on or before ${ruleTo.format('DD/MM/YYYY')} (rule end date)`
    }
  }

  // Valid From must be before or equal to Valid To
  if (setupTo && setupFrom.isAfter(setupTo, 'day')) {
    return {
      message: 'Valid From must be on or before Valid To'
    }
  }

  return null
}

/**
 * Formats date string to ISO format for backend (java.time.Instant)
 */
export const formatDateToISO = (dateStr: string | undefined): string | undefined => {
  if (!dateStr) return undefined
  return dayjs(dateStr).startOf('day').toISOString()
}
