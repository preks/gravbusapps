import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DeactivationReasonOption {
  value: string
  labelKey: string
  defaultLabel: string
}

/**
 * Predefined deactivation reason options
 */
export const DEACTIVATION_REASON_OPTIONS: DeactivationReasonOption[] = [
  {
    value: 'no_longer_needed',
    labelKey: 'lowcoder:compensation.reason_no_longer_needed',
    defaultLabel: 'No longer needed'
  },
  {
    value: 'found_alternative',
    labelKey: 'lowcoder:compensation.reason_found_alternative',
    defaultLabel: 'Found alternative'
  },
  {
    value: 'cost_reduction',
    labelKey: 'lowcoder:compensation.reason_cost_reduction',
    defaultLabel: 'Cost reduction'
  },
  {
    value: 'other',
    labelKey: 'lowcoder:compensation.reason_other',
    defaultLabel: 'Other'
  }
]

/**
 * Get localized label for a reason option
 */
export const getReasonLabel = (reasonValue: string): string => {
  const reason = DEACTIVATION_REASON_OPTIONS.find(r => r.value === reasonValue)
  if (!reason) return reasonValue
  return getTranslationFromI18nKeyAndLabel(reason.labelKey, reason.defaultLabel)
}
