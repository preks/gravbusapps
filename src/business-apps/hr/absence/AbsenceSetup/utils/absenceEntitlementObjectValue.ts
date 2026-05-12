import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'
import type { EligibilitySettings } from './absenceEligibilityConflict'
import {
  isObjectRecord,
  toBooleanValue,
  toNumberValue,
  toStringArray,
  toStringValue
} from './objectValueHelpers'

export interface AbsenceEntitlementDetailSettings {
  carryover: boolean
  prorata_method: string
  rounding_method: string
  absence_type_ref: string
  prolong_approval: string
  validation_amount: string
  carryover_approval: string
  entitlement_amount: string
  max_carryover_amount: string
  max_carryover_percent: string
  validation_amount_unit: string
}

export interface AbsenceEntitlementObjectSettings extends EligibilitySettings {
  valid_from: string
  valid_to: string
  year_type: string
  full_time_unit: string
  year_start_date: string
  entitlement_type: string
  full_time_amount: string
  full_time_frequency: string
}

export interface AbsenceEntitlementObjectValue extends JSONObject {
  details?: JSONObject[]
}

interface AbsenceEntitlementEditorState {
  settings: AbsenceEntitlementObjectSettings
  detailEntries: AbsenceEntitlementDetailEntry[]
  extraObjectValue: JSONObject
}

export interface AbsenceEntitlementDetailEntry {
  id: string
  settings: AbsenceEntitlementDetailSettings
  extraValue: JSONObject
}

export const defaultAbsenceEntitlementObjectSettings: AbsenceEntitlementObjectSettings = {
  valid_from: '',
  valid_to: '',
  year_type: 'CALENDAR_YEAR',
  full_time_unit: 'HOURS',
  year_start_date: '01.01',
  entitlement_type: 'YEARLY',
  full_time_amount: '40',
  full_time_frequency: 'WEEK',
  standard: false,
  company_id: '',
  allowed_countries: [],
  allowed_contract_types: [],
  allowed_employment_types: []
}

export const defaultAbsenceEntitlementDetailSettings: AbsenceEntitlementDetailSettings = {
  carryover: true,
  prorata_method: 'NEVER,_EXCEPT_LESS_THAN_A_FULL_YEAR',
  rounding_method: 'ARITHMETICALLY ON ONE DECIMAL PLACE',
  absence_type_ref: '',
  prolong_approval: 'HR',
  validation_amount: '5',
  carryover_approval: 'GENERAL',
  entitlement_amount: '21',
  max_carryover_amount: '',
  max_carryover_percent: '',
  validation_amount_unit: 'MONTH'
}

const toCarryoverStringValue = (value: JSONValue | undefined): string => {
  if (typeof value === 'number') return value === 0 ? '' : String(value)
  if (typeof value === 'string') return value === '0' ? '' : value
  return ''
}

export const getAbsenceTypeRefFromType = (absenceType?: AbsenceType): string =>
  absenceType ? `AbsenceType:v1:${absenceType.code}` : ''

export const getAbsenceTypeOptionLabel = (absenceType: AbsenceType): string =>
  `${absenceType.code} - ${absenceType.value || absenceType.code}`

export const getAbsenceEntitlementEditorState = (
  objectValue?: AbsenceEntitlementObjectValue
): AbsenceEntitlementEditorState => {
  if (!isObjectRecord(objectValue)) {
    return {
      settings: defaultAbsenceEntitlementObjectSettings,
      detailEntries: [],
      extraObjectValue: {}
    }
  }

  const {
    details,
    valid_from,
    valid_to,
    validFrom,
    validTo,
    year_type,
    full_time_unit,
    year_start_date,
    entitlement_type,
    full_time_amount,
    full_time_frequency,
    standard,
    company_id,
    allowed_countries,
    allowed_contract_types,
    allowed_employment_types,
    ...extraObjectValue
  } = objectValue

  const detailObjects = Array.isArray(details) ? details.filter(isObjectRecord) : []
  const detailEntries = detailObjects.map((detail, index) => {
    const {
      carryover,
      prorata_method,
      rounding_method,
      absence_type_ref,
      prolong_approval,
      validation_amount,
      carryover_approval,
      entitlement_amount,
      max_carryover_amount,
      max_carryover_percent,
      validation_amount_unit,
      ...extraValue
    } = detail

    return {
      id: `detail-${index}`,
      settings: {
        carryover: toBooleanValue(carryover, defaultAbsenceEntitlementDetailSettings.carryover),
        prorata_method: toStringValue(prorata_method, defaultAbsenceEntitlementDetailSettings.prorata_method),
        rounding_method: toStringValue(rounding_method, defaultAbsenceEntitlementDetailSettings.rounding_method),
        absence_type_ref: toStringValue(absence_type_ref, defaultAbsenceEntitlementDetailSettings.absence_type_ref),
        prolong_approval: toStringValue(prolong_approval, defaultAbsenceEntitlementDetailSettings.prolong_approval),
        validation_amount: toStringValue(validation_amount, defaultAbsenceEntitlementDetailSettings.validation_amount),
        carryover_approval: toStringValue(
          carryover_approval,
          defaultAbsenceEntitlementDetailSettings.carryover_approval
        ),
        entitlement_amount: toStringValue(
          entitlement_amount,
          defaultAbsenceEntitlementDetailSettings.entitlement_amount
        ),
        max_carryover_amount: toCarryoverStringValue(max_carryover_amount),
        max_carryover_percent: toCarryoverStringValue(max_carryover_percent),
        validation_amount_unit: toStringValue(
          validation_amount_unit,
          defaultAbsenceEntitlementDetailSettings.validation_amount_unit
        )
      },
      extraValue
    } satisfies AbsenceEntitlementDetailEntry
  })

  const parsedSettings: AbsenceEntitlementObjectSettings = {
    valid_from: toStringValue(valid_from ?? validFrom, defaultAbsenceEntitlementObjectSettings.valid_from),
    valid_to: toStringValue(valid_to ?? validTo, defaultAbsenceEntitlementObjectSettings.valid_to),
    year_type: toStringValue(year_type, defaultAbsenceEntitlementObjectSettings.year_type),
    full_time_unit: toStringValue(full_time_unit, defaultAbsenceEntitlementObjectSettings.full_time_unit),
    year_start_date: toStringValue(year_start_date, defaultAbsenceEntitlementObjectSettings.year_start_date),
    entitlement_type: toStringValue(entitlement_type, defaultAbsenceEntitlementObjectSettings.entitlement_type),
    full_time_amount: toStringValue(full_time_amount, defaultAbsenceEntitlementObjectSettings.full_time_amount),
    full_time_frequency: toStringValue(
      full_time_frequency,
      defaultAbsenceEntitlementObjectSettings.full_time_frequency
    ),
    standard: toBooleanValue(standard, defaultAbsenceEntitlementObjectSettings.standard),
    company_id: toStringValue(company_id, defaultAbsenceEntitlementObjectSettings.company_id),
    allowed_countries: toStringArray(allowed_countries),
    allowed_contract_types: toStringArray(allowed_contract_types),
    allowed_employment_types: toStringArray(allowed_employment_types)
  }

  if (detailEntries.length === 0) {
    return { settings: parsedSettings, detailEntries: [], extraObjectValue }
  }

  return { settings: parsedSettings, detailEntries, extraObjectValue }
}

export const buildAbsenceEntitlementObjectValue = (
  settings: AbsenceEntitlementObjectSettings,
  detailEntries: AbsenceEntitlementDetailEntry[],
  extraObjectValue: JSONObject
): AbsenceEntitlementObjectValue => ({
  ...extraObjectValue,
  valid_from: settings.valid_from.trim(),
  valid_to: settings.valid_to.trim(),
  year_type: settings.year_type.trim(),
  full_time_unit: settings.full_time_unit.trim(),
  year_start_date: settings.year_start_date.trim(),
  entitlement_type: settings.entitlement_type.trim(),
  full_time_amount: toNumberValue(settings.full_time_amount),
  full_time_frequency: settings.full_time_frequency.trim(),
  standard: settings.standard,
  company_id: settings.company_id.trim(),
  allowed_countries: settings.allowed_countries,
  allowed_contract_types: settings.allowed_contract_types,
  allowed_employment_types: settings.allowed_employment_types,
  details: detailEntries.map(detailEntry => ({
    ...detailEntry.extraValue,
    carryover: detailEntry.settings.carryover,
    prorata_method: detailEntry.settings.prorata_method.trim(),
    rounding_method: detailEntry.settings.rounding_method.trim(),
    absence_type_ref: detailEntry.settings.absence_type_ref.trim(),
    prolong_approval: detailEntry.settings.prolong_approval.trim(),
    validation_amount: toNumberValue(detailEntry.settings.validation_amount),
    carryover_approval: detailEntry.settings.carryover_approval.trim(),
    entitlement_amount: toNumberValue(detailEntry.settings.entitlement_amount),
    max_carryover_amount: toNumberValue(detailEntry.settings.max_carryover_amount),
    max_carryover_percent: toNumberValue(detailEntry.settings.max_carryover_percent),
    validation_amount_unit: detailEntry.settings.validation_amount_unit.trim()
  }))
})

export const getAbsenceEntitlementDescription = (objectValue?: AbsenceEntitlementObjectValue): string => {
  if (!isObjectRecord(objectValue)) {
    return ''
  }

  const entitlementType = toStringValue(objectValue.entitlement_type, '')
  const detailCodes = (Array.isArray(objectValue.details) ? objectValue.details : [])
    .filter(isObjectRecord)
    .map(detail => toStringValue(detail.absence_type_ref, '').split(':').pop() || '')
    .filter(Boolean)

  const detailSummary =
    detailCodes.length > 2 ? `${detailCodes.slice(0, 2).join(', ')} +${detailCodes.length - 2}` : detailCodes.join(', ')

  return [entitlementType, detailSummary].filter(Boolean).join(' | ')
}
