import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'

export interface AbsencePolicyDetailSettings {
  description: string
  allowed_amount: string
  periods_amount: string
  absence_type_ref: string
  policy_rule_type: string
  policy_rule_category: string
  allowed_amount_time_unit: string
  periods_amount_time_unit: string
}

export interface AbsencePolicyObjectValue extends JSONObject {
  details?: JSONObject[]
}

export interface AbsencePolicyEditorDetail {
  id: number
  settings: AbsencePolicyDetailSettings
  extraDetailValue: JSONObject
}

interface AbsencePolicyEditorState {
  details: AbsencePolicyEditorDetail[]
  extraObjectValue: JSONObject
}

export const defaultAbsencePolicyDetailSettings: AbsencePolicyDetailSettings = {
  description: '',
  allowed_amount: '0',
  periods_amount: '0',
  absence_type_ref: '',
  policy_rule_type: 'SPECIFIC_POLICY',
  policy_rule_category: 'MIN_DURATION',
  allowed_amount_time_unit: 'DAYS',
  periods_amount_time_unit: 'MONTHS'
}

const isObjectRecord = (value: JSONValue | undefined): value is JSONObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toStringValue = (value: JSONValue | undefined, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const toNumberValue = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const getAbsencePolicyEditorState = (objectValue?: AbsencePolicyObjectValue): AbsencePolicyEditorState => {
  if (!isObjectRecord(objectValue)) {
    return {
      details: [],
      extraObjectValue: {}
    }
  }

  const { details, ...extraObjectValue } = objectValue

  if (!Array.isArray(details) || details.length === 0) {
    return {
      details: [],
      extraObjectValue
    }
  }

  const parsedDetails = details
    .map((detail, index) => {
      if (!isObjectRecord(detail)) {
        return null
      }

      const {
        description,
        allowed_amount,
        periods_amount,
        absence_type_ref,
        policy_rule_type,
        policy_rule_category,
        allowed_amount_time_unit,
        periods_amount_time_unit,
        ...extraDetailValue
      } = detail

      return {
        id: index + 1,
        settings: {
          description: toStringValue(description, defaultAbsencePolicyDetailSettings.description),
          allowed_amount: toStringValue(allowed_amount, defaultAbsencePolicyDetailSettings.allowed_amount),
          periods_amount: toStringValue(periods_amount, defaultAbsencePolicyDetailSettings.periods_amount),
          absence_type_ref: toStringValue(absence_type_ref, defaultAbsencePolicyDetailSettings.absence_type_ref),
          policy_rule_type: toStringValue(policy_rule_type, defaultAbsencePolicyDetailSettings.policy_rule_type),
          policy_rule_category: toStringValue(
            policy_rule_category,
            defaultAbsencePolicyDetailSettings.policy_rule_category
          ),
          allowed_amount_time_unit: toStringValue(
            allowed_amount_time_unit,
            defaultAbsencePolicyDetailSettings.allowed_amount_time_unit
          ),
          periods_amount_time_unit: toStringValue(
            periods_amount_time_unit,
            defaultAbsencePolicyDetailSettings.periods_amount_time_unit
          )
        },
        extraDetailValue
      } satisfies AbsencePolicyEditorDetail
    })
    .filter((detail): detail is AbsencePolicyEditorDetail => Boolean(detail))

  return {
    details: parsedDetails,
    extraObjectValue
  }
}

export const buildAbsencePolicyObjectValue = (
  details: AbsencePolicyEditorDetail[],
  extraObjectValue: JSONObject
): AbsencePolicyObjectValue => ({
  ...extraObjectValue,
  details: details.map(detail => ({
    ...detail.extraDetailValue,
    description: detail.settings.description.trim(),
    allowed_amount: toNumberValue(detail.settings.allowed_amount),
    periods_amount: toNumberValue(detail.settings.periods_amount),
    absence_type_ref: detail.settings.absence_type_ref.trim(),
    policy_rule_type: detail.settings.policy_rule_type.trim(),
    policy_rule_category: detail.settings.policy_rule_category.trim(),
    allowed_amount_time_unit: detail.settings.allowed_amount_time_unit.trim(),
    periods_amount_time_unit: detail.settings.periods_amount_time_unit.trim()
  }))
})

export const getAbsencePolicyDescription = (objectValue?: AbsencePolicyObjectValue): string => {
  if (!isObjectRecord(objectValue) || !Array.isArray(objectValue.details)) {
    return ''
  }

  const firstDetail = objectValue.details.find(isObjectRecord)
  if (!firstDetail) {
    return ''
  }

  const description = toStringValue(firstDetail.description, '')
  if (description) {
    return description
  }

  const category = toStringValue(firstDetail.policy_rule_category, '')
  const absenceTypeRef = toStringValue(firstDetail.absence_type_ref, '')
  const absenceTypeCode = absenceTypeRef.split(':').pop() || ''

  return [category, absenceTypeCode].filter(Boolean).join(' | ')
}
