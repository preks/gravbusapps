import type { JSONObject } from '@/common/types/i18nTypes'
import type { EligibilitySettings } from './absenceEligibilityConflict'
import {
  isObjectRecord,
  toBooleanValue,
  toNumberValue,
  toStringArray,
  toStringValue
} from './objectValueHelpers'

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

export type AbsencePolicyObjectSettings = EligibilitySettings

export const defaultAbsencePolicyObjectSettings: AbsencePolicyObjectSettings = {
  company_id: '',
  standard: false,
  allowed_countries: [],
  allowed_contract_types: [],
  allowed_employment_types: []
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
  settings: AbsencePolicyObjectSettings
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


export const getAbsencePolicyEditorState = (objectValue?: AbsencePolicyObjectValue): AbsencePolicyEditorState => {
  if (!isObjectRecord(objectValue)) {
    return {
      settings: defaultAbsencePolicyObjectSettings,
      details: [],
      extraObjectValue: {}
    }
  }

  const {
    details,
    company_id,
    standard,
    allowed_countries,
    allowed_contract_types,
    allowed_employment_types,
    ...extraObjectValue
  } = objectValue

  const settings: AbsencePolicyObjectSettings = {
    company_id: toStringValue(company_id, ''),
    standard: toBooleanValue(standard, false),
    allowed_countries: toStringArray(allowed_countries),
    allowed_contract_types: toStringArray(allowed_contract_types),
    allowed_employment_types: toStringArray(allowed_employment_types)
  }

  if (!Array.isArray(details) || details.length === 0) {
    return {
      settings,
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
    settings,
    details: parsedDetails,
    extraObjectValue
  }
}

export const buildAbsencePolicyObjectValue = (
  settings: AbsencePolicyObjectSettings,
  details: AbsencePolicyEditorDetail[],
  extraObjectValue: JSONObject
): AbsencePolicyObjectValue => ({
  ...extraObjectValue,
  company_id: settings.company_id || undefined,
  standard: settings.standard || undefined,
  allowed_countries: settings.allowed_countries.length > 0 ? settings.allowed_countries : undefined,
  allowed_contract_types: settings.allowed_contract_types.length > 0 ? settings.allowed_contract_types : undefined,
  allowed_employment_types:
    settings.allowed_employment_types.length > 0 ? settings.allowed_employment_types : undefined,
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
