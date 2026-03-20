import dayjs from 'dayjs'
import { formatDateForInput } from '../../../utils'

export interface ValidityDateResult {
  activeFrom: string
  activeTo: string
}

interface ExistingEntry {
  activeFrom: string
  activeTo?: string
}

/**
 * Get initial validity dates for a new entry by copying from the first existing entry.
 * If no existing entries or first entry has no activeTo, uses the rule's dates.
 *
 * Used by: AllowancePeriodTab, CustomFieldsTab, AllowanceCodeTab, AllowanceSetupTab
 *
 * @param existingEntries - Array of existing entries to copy dates from
 * @param ruleActiveFrom - Parent rule's activeFrom date
 * @param ruleActiveTo - Parent rule's activeTo date (optional)
 * @returns Active date pair for form initialization
 */
export const getValidityDatesFromExisting = (
  existingEntries: ExistingEntry[],
  ruleActiveFrom: string,
  ruleActiveTo?: string
): ValidityDateResult => {
  const defaultValidTo = '9999-12-31'
  let activeFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  // Default activeTo from rule, with fallback to '9999-12-31'
  let activeTo: string = formatDateForInput(ruleActiveTo) || defaultValidTo

  if (existingEntries.length > 0) {
    const firstEntry = existingEntries[0]
    activeFrom = formatDateForInput(firstEntry.activeFrom) || activeFrom
    // Use first entry's activeTo if available, otherwise keep the rule's activeTo
    const entryActiveTo = formatDateForInput(firstEntry.activeTo)
    if (entryActiveTo) {
      activeTo = entryActiveTo
    }
  }

  return { activeFrom, activeTo }
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
  const activeFrom = formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD')
  const activeTo: string = formatDateForInput(ruleActiveTo) || defaultValidTo

  return { activeFrom, activeTo }
}
