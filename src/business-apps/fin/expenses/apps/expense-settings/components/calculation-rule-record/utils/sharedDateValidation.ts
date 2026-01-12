import dayjs from 'dayjs'

export type DateFieldName = 'validFrom' | 'validTo' | 'activeFrom' | 'activeTo'

export interface DateValidationError {
  field: DateFieldName
  message: string
}

export interface ValidateDateRangeOptions {
  entryFrom: string
  entryTo?: string
  ruleFrom: string
  ruleTo?: string
  fromFieldName?: DateFieldName
  toFieldName?: DateFieldName
}

/**
 * Validates entry dates against rule date boundaries
 * Returns array of errors, empty if all valid
 *
 * This shared utility reduces cognitive complexity by extracting
 * the common date validation pattern used across all tabs.
 */
export const validateDateRange = (options: ValidateDateRangeOptions): DateValidationError[] => {
  const { entryFrom, entryTo, ruleFrom, ruleTo, fromFieldName = 'validFrom', toFieldName = 'validTo' } = options

  const errors: DateValidationError[] = []

  const ruleDateFrom = dayjs(ruleFrom)
  const ruleDateTo = ruleTo ? dayjs(ruleTo) : null
  const entryDateFrom = dayjs(entryFrom)
  const entryDateTo = entryTo ? dayjs(entryTo) : null

  // Valid From cannot be before rule's Valid From
  if (entryDateFrom.isBefore(ruleDateFrom, 'day')) {
    errors.push({
      field: fromFieldName,
      message: `Valid From cannot be before the rule's Valid From (${ruleDateFrom.format('DD.MM.YYYY')})`
    })
  }

  // Valid From cannot be after rule's Valid To
  if (ruleDateTo && entryDateFrom.isAfter(ruleDateTo, 'day')) {
    errors.push({
      field: fromFieldName,
      message: `Valid From cannot be after the rule's Valid To (${ruleDateTo.format('DD.MM.YYYY')})`
    })
  }

  // Valid To cannot be after rule's Valid To
  if (ruleDateTo && entryDateTo && entryDateTo.isAfter(ruleDateTo, 'day')) {
    errors.push({
      field: toFieldName,
      message: `Valid To cannot be after the rule's Valid To (${ruleDateTo.format('DD.MM.YYYY')})`
    })
  }

  // Valid To cannot be before Valid From
  if (entryDateTo && entryDateFrom.isAfter(entryDateTo, 'day')) {
    errors.push({
      field: toFieldName,
      message: `Valid To cannot be before Valid From`
    })
  }

  return errors
}

/**
 * Applies date validation errors to a react-hook-form instance
 */
export const applyDateValidationErrors = (
  errors: DateValidationError[],
  setError: (field: string, error: { type: string; message: string }) => void
): boolean => {
  if (errors.length === 0) return false

  errors.forEach(err => {
    setError(err.field, { type: 'manual', message: err.message })
  })

  return true
}
