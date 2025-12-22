import dayjs from 'dayjs'

/**
 * Validates mutual exclusivity between amount and percentage
 * Returns error message if both are set, null if valid
 */
export const validateAmountAndPercentage = (amount?: number | null, percentage?: number | null): string | null => {
  const hasAmount = amount !== undefined && amount !== null && amount > 0
  const hasPercentage = percentage !== undefined && percentage !== null && percentage !== 0

  if (hasAmount && hasPercentage) {
    return 'Cannot have both Amount and Percentage. Please use only one.'
  }

  return null
}

export interface DateValidationError {
  field: 'validFrom' | 'validTo'
  message: string
}

/**
 * Validates allowance code dates against rule dates
 * Returns array of errors, empty if all valid
 */
export const validateAllowanceCodeDates = (
  validFrom: string,
  validTo: string | undefined,
  ruleActiveFrom: string,
  ruleActiveTo?: string
): DateValidationError[] => {
  const errors: DateValidationError[] = []

  const ruleFrom = dayjs(ruleActiveFrom)
  const ruleTo = ruleActiveTo ? dayjs(ruleActiveTo) : null
  const entryFrom = dayjs(validFrom)
  const entryTo = validTo ? dayjs(validTo) : null

  // Valid From cannot be before rule's Valid From
  if (entryFrom.isBefore(ruleFrom, 'day')) {
    errors.push({
      field: 'validFrom',
      message: `Valid From must be on or after ${ruleFrom.format('DD/MM/YYYY')} (rule start date)`
    })
  }

  // Valid From cannot be after rule's Valid To
  if (ruleTo && entryFrom.isAfter(ruleTo, 'day')) {
    errors.push({
      field: 'validFrom',
      message: `Valid From must be on or before ${ruleTo.format('DD/MM/YYYY')} (rule end date)`
    })
  }

  // Valid To cannot be after rule's Valid To
  if (ruleTo?.isAfter && entryTo?.isAfter(ruleTo, 'day')) {
    errors.push({
      field: 'validTo',
      message: `Valid To must be on or before ${ruleTo.format('DD/MM/YYYY')} (rule end date)`
    })
  }

  // Valid To cannot be before Valid From
  if (entryTo && entryFrom.isAfter(entryTo, 'day')) {
    errors.push({
      field: 'validTo',
      message: `Valid To must be on or after Valid From`
    })
  }

  return errors
}
