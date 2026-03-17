import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'

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

export interface AbsenceEntitlementObjectSettings {
  year_type: string
  full_time_unit: string
  year_start_date: string
  entitlement_type: string
  full_time_amount: string
  full_time_frequency: string
  advance_generation_amount: string
  advance_generation_time_unit: string
}

export interface AbsenceEntitlementObjectValue extends JSONObject {
  details?: JSONObject[]
}

interface AbsenceEntitlementEditorState {
  settings: AbsenceEntitlementObjectSettings
  detailSettings: AbsenceEntitlementDetailSettings
  extraObjectValue: JSONObject
  extraDetailValue: JSONObject
  extraDetails: JSONObject[]
}

export const defaultAbsenceEntitlementObjectSettings: AbsenceEntitlementObjectSettings = {
  year_type: 'CALENDAR_YEAR',
  full_time_unit: 'HOURS',
  year_start_date: '01.01',
  entitlement_type: 'YEARLY',
  full_time_amount: '40',
  full_time_frequency: 'WEEK',
  advance_generation_amount: '1',
  advance_generation_time_unit: 'MONTHS'
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
  max_carryover_amount: '0',
  max_carryover_percent: '0',
  validation_amount_unit: 'MONTH'
}

const isObjectRecord = (value: JSONValue | undefined): value is JSONObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toStringValue = (value: JSONValue | undefined, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const toBooleanValue = (value: JSONValue | undefined, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const toNumberValue = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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
      detailSettings: defaultAbsenceEntitlementDetailSettings,
      extraObjectValue: {},
      extraDetailValue: {},
      extraDetails: []
    }
  }

  const {
    details,
    year_type,
    full_time_unit,
    year_start_date,
    entitlement_type,
    full_time_amount,
    full_time_frequency,
    advance_generation_amount,
    advance_generation_time_unit,
    ...extraObjectValue
  } = objectValue

  const firstDetail = Array.isArray(details) && isObjectRecord(details[0]) ? details[0] : undefined
  const extraDetails = Array.isArray(details) ? details.slice(1).filter(isObjectRecord) : []

  if (!firstDetail) {
    return {
      settings: {
        year_type: toStringValue(year_type, defaultAbsenceEntitlementObjectSettings.year_type),
        full_time_unit: toStringValue(full_time_unit, defaultAbsenceEntitlementObjectSettings.full_time_unit),
        year_start_date: toStringValue(year_start_date, defaultAbsenceEntitlementObjectSettings.year_start_date),
        entitlement_type: toStringValue(entitlement_type, defaultAbsenceEntitlementObjectSettings.entitlement_type),
        full_time_amount: toStringValue(full_time_amount, defaultAbsenceEntitlementObjectSettings.full_time_amount),
        full_time_frequency: toStringValue(
          full_time_frequency,
          defaultAbsenceEntitlementObjectSettings.full_time_frequency
        ),
        advance_generation_amount: toStringValue(
          advance_generation_amount,
          defaultAbsenceEntitlementObjectSettings.advance_generation_amount
        ),
        advance_generation_time_unit: toStringValue(
          advance_generation_time_unit,
          defaultAbsenceEntitlementObjectSettings.advance_generation_time_unit
        )
      },
      detailSettings: defaultAbsenceEntitlementDetailSettings,
      extraObjectValue,
      extraDetailValue: {},
      extraDetails
    }
  }

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
    ...extraDetailValue
  } = firstDetail

  return {
    settings: {
      year_type: toStringValue(year_type, defaultAbsenceEntitlementObjectSettings.year_type),
      full_time_unit: toStringValue(full_time_unit, defaultAbsenceEntitlementObjectSettings.full_time_unit),
      year_start_date: toStringValue(year_start_date, defaultAbsenceEntitlementObjectSettings.year_start_date),
      entitlement_type: toStringValue(entitlement_type, defaultAbsenceEntitlementObjectSettings.entitlement_type),
      full_time_amount: toStringValue(full_time_amount, defaultAbsenceEntitlementObjectSettings.full_time_amount),
      full_time_frequency: toStringValue(
        full_time_frequency,
        defaultAbsenceEntitlementObjectSettings.full_time_frequency
      ),
      advance_generation_amount: toStringValue(
        advance_generation_amount,
        defaultAbsenceEntitlementObjectSettings.advance_generation_amount
      ),
      advance_generation_time_unit: toStringValue(
        advance_generation_time_unit,
        defaultAbsenceEntitlementObjectSettings.advance_generation_time_unit
      )
    },
    detailSettings: {
      carryover: toBooleanValue(carryover, defaultAbsenceEntitlementDetailSettings.carryover),
      prorata_method: toStringValue(prorata_method, defaultAbsenceEntitlementDetailSettings.prorata_method),
      rounding_method: toStringValue(rounding_method, defaultAbsenceEntitlementDetailSettings.rounding_method),
      absence_type_ref: toStringValue(absence_type_ref, defaultAbsenceEntitlementDetailSettings.absence_type_ref),
      prolong_approval: toStringValue(prolong_approval, defaultAbsenceEntitlementDetailSettings.prolong_approval),
      validation_amount: toStringValue(validation_amount, defaultAbsenceEntitlementDetailSettings.validation_amount),
      carryover_approval: toStringValue(carryover_approval, defaultAbsenceEntitlementDetailSettings.carryover_approval),
      entitlement_amount: toStringValue(entitlement_amount, defaultAbsenceEntitlementDetailSettings.entitlement_amount),
      max_carryover_amount: toStringValue(
        max_carryover_amount,
        defaultAbsenceEntitlementDetailSettings.max_carryover_amount
      ),
      max_carryover_percent: toStringValue(
        max_carryover_percent,
        defaultAbsenceEntitlementDetailSettings.max_carryover_percent
      ),
      validation_amount_unit: toStringValue(
        validation_amount_unit,
        defaultAbsenceEntitlementDetailSettings.validation_amount_unit
      )
    },
    extraObjectValue,
    extraDetailValue,
    extraDetails
  }
}

export const buildAbsenceEntitlementObjectValue = (
  settings: AbsenceEntitlementObjectSettings,
  detailSettings: AbsenceEntitlementDetailSettings,
  extraObjectValue: JSONObject,
  extraDetailValue: JSONObject,
  extraDetails: JSONObject[]
): AbsenceEntitlementObjectValue => ({
  ...extraObjectValue,
  year_type: settings.year_type.trim(),
  full_time_unit: settings.full_time_unit.trim(),
  year_start_date: settings.year_start_date.trim(),
  entitlement_type: settings.entitlement_type.trim(),
  full_time_amount: toNumberValue(settings.full_time_amount),
  full_time_frequency: settings.full_time_frequency.trim(),
  advance_generation_amount: toNumberValue(settings.advance_generation_amount),
  advance_generation_time_unit: settings.advance_generation_time_unit.trim(),
  details: [
    {
      ...extraDetailValue,
      carryover: detailSettings.carryover,
      prorata_method: detailSettings.prorata_method.trim(),
      rounding_method: detailSettings.rounding_method.trim(),
      absence_type_ref: detailSettings.absence_type_ref.trim(),
      prolong_approval: detailSettings.prolong_approval.trim(),
      validation_amount: toNumberValue(detailSettings.validation_amount),
      carryover_approval: detailSettings.carryover_approval.trim(),
      entitlement_amount: toNumberValue(detailSettings.entitlement_amount),
      max_carryover_amount: toNumberValue(detailSettings.max_carryover_amount),
      max_carryover_percent: toNumberValue(detailSettings.max_carryover_percent),
      validation_amount_unit: detailSettings.validation_amount_unit.trim()
    },
    ...extraDetails
  ]
})

export const getAbsenceEntitlementDescription = (objectValue?: AbsenceEntitlementObjectValue): string => {
  if (!isObjectRecord(objectValue)) {
    return ''
  }

  const entitlementType = toStringValue(objectValue.entitlement_type, '')
  const firstDetail =
    Array.isArray(objectValue.details) && isObjectRecord(objectValue.details[0]) ? objectValue.details[0] : undefined
  const absenceTypeRef = toStringValue(firstDetail?.absence_type_ref, '')
  const absenceTypeCode = absenceTypeRef.split(':').pop() || ''

  return [entitlementType, absenceTypeCode].filter(Boolean).join(' | ')
}
