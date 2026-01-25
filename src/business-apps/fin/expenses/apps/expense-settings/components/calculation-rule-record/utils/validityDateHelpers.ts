import dayjs from 'dayjs'
import { formatDateForInput } from '../../../utils'

export interface ValidityDateResult {
  validFrom: string
  validTo: string
}

interface ExistingEntry {
  validFrom: string
  validTo?: string
}

/**
 * Get initial validity dates for a new entry by copying from the first existing entry.
 * If no existing entries or first entry has no validTo, uses the rule's dates.
 *
 * Used by: AllowancePeriodTab, CustomFieldsTab, AllowanceCodeTab, AllowanceSetupTab
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
  const defaultValidTo = '9999-12-31'
  let validFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  // Default validTo from rule, with fallback to '9999-12-31'
  let validTo: string = formatDateForInput(ruleActiveTo) || defaultValidTo

  if (existingEntries.length > 0) {
    const firstEntry = existingEntries[0]
    validFrom = formatDateForInput(firstEntry.validFrom) || validFrom
    // Use first entry's validTo if available, otherwise keep the rule's validTo
    const entryValidTo = formatDateForInput(firstEntry.validTo)
    if (entryValidTo) {
      validTo = entryValidTo
    }
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
  const defaultValidTo = '9999-12-31'
  const validFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  const validTo: string = formatDateForInput(ruleActiveTo) || defaultValidTo

  return { validFrom, validTo }
}
