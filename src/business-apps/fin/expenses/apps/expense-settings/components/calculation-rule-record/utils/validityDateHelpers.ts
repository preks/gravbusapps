import dayjs from 'dayjs'
import { formatDateForInput } from '../../../utils'

export interface ValidityDateResult {
  validFrom: string
  validTo: string | undefined
}

interface ExistingEntry {
  validFrom: string
  validTo?: string
}

/**
 * Get initial validity dates for a new entry by copying from the first existing entry.
 * If no existing entries, uses the rule's dates.
 *
 * Used by: AllowancePeriodTab, CustomFieldsTab
 *
 * @param existingEntries - Array of existing entries to copy dates from
 * @param ruleActiveFrom - Parent rule's activeFrom date
 * @param ruleActiveTo - Parent rule's activeTo date (optional)
 * @returns Validity date pair for form initialization
 */
export const getValidityDatesFromExisting = (
  existingEntries: ExistingEntry[],
  ruleActiveFrom: string,
  ruleActiveTo?: string
): ValidityDateResult => {
  let validFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  let validTo: string | undefined = undefined

  if (existingEntries.length > 0) {
    const firstEntry = existingEntries[0]
    validFrom = formatDateForInput(firstEntry.validFrom) || validFrom
    validTo = formatDateForInput(firstEntry.validTo)
  } else {
    validTo = formatDateForInput(ruleActiveTo) || '9999-12-31'
  }

  return { validFrom, validTo }
}

/**
 * Get initial validity dates for a new entry directly from the parent rule.
 * Always uses the rule's dates (simpler pattern).
 *
 * Used by: MileageRulesTab, OtherCalculationTab
 *
 * @param ruleActiveFrom - Parent rule's activeFrom date
 * @param ruleActiveTo - Parent rule's activeTo date (optional)
 * @returns Validity date pair for form initialization
 */
export const getValidityDatesFromRule = (ruleActiveFrom: string, ruleActiveTo?: string): ValidityDateResult => {
  const validFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  const validTo = formatDateForInput(ruleActiveTo) || '9999-12-31'

  return { validFrom, validTo }
}
