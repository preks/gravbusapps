import dayjs from 'dayjs'

/**
 * Validates amount and percentage fields:
 * - At least one must be filled (amount != 0 or percentage != 0)
 * - Cannot have both filled at the same time
 * Returns error message if validation fails, null if valid
 */
export const validateAmountAndPercentage = (amount?: number | null, percentage?: number | null): string | null => {
  // Amount is valid if it's a non-zero number (positive or negative for deductions)
  const hasAmount = amount !== undefined && amount !== null && amount !== 0
  // Percentage is valid if it's non-zero (positive or negative for deductions like -15%)
  const hasPercentage = percentage !== undefined && percentage !== null && percentage !== 0

  // Cannot have both
  if (hasAmount && hasPercentage) {
    return 'Cannot have both Amount and Percentage. Please use only one.'
  }

  // Must have at least one
  if (!hasAmount && !hasPercentage) {
    return 'Either Amount or Percentage is required.'
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
