import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { AbsenceEntitlementObjectValue } from './absenceEntitlementObjectValue'

export interface SetupSectionItem {
  id: string
  title: string
  description: string
}

export interface MockEntitlementSummary {
  id: string
  code: string
  name: string
  type: string
  status: string
  objectValue?: AbsenceEntitlementObjectValue
}

export interface AbsenceTypeVersionFormValues {
  code: string
  version: string
  validFrom: string
  validTo: string
  colorToken: string
  measurement: string
  behaviour: string
  priority: string
  enteredBy: string
  substitute: boolean
  relative: boolean
  document: boolean
  anonymous: boolean
  halfDays: boolean
  accessPlan: boolean
  accessRequest: boolean
}

export interface AbsenceTypeEntitlementRow {
  id: number
  absenceTypeId: string
  code: string
  name: string
  entitlement: string
}

export interface AbsenceEntitlementFormValues {
  code: string
  name: string
  type: string
  validFrom: string
  validTo: string
  fullTimeAmount: string
  fullTimeUnit: string
  fullTimePeriod: string
  yearType: string
  fiscalYearStart: string
  advanceAmount: string
  advanceUnit: string
}

export const mockEntitlementSummaries: MockEntitlementSummary[] = [
  {
    id: 'annual-entitlement',
    code: 'ANNUAL',
    name: 'Annual Leave Entitlement',
    type: 'Yearly',
    status: 'Active',
    objectValue: {
      details: [
        {
          carryover: true,
          prorata_method: 'NEVER,_EXCEPT_LESS_THAN_A_FULL_YEAR',
          rounding_method: 'ARITHMETICALLY ON ONE DECIMAL PLACE',
          absence_type_ref: 'AbsenceType:v1:A001',
          prolong_approval: 'HR',
          validation_amount: 5,
          carryover_approval: 'GENERAL',
          entitlement_amount: 21,
          max_carryover_amount: 0,
          max_carryover_percent: 0,
          validation_amount_unit: 'MONTH'
        }
      ],
      year_type: 'CALENDAR_YEAR',
      full_time_unit: 'HOURS',
      year_start_date: '01.01',
      entitlement_type: 'YEARLY',
      full_time_amount: 40,
      full_time_frequency: 'WEEK',
      advance_generation_amount: 1,
      advance_generation_time_unit: 'MONTHS'
    }
  },
  {
    id: 'sick-entitlement',
    code: 'SICK',
    name: 'Sick Leave Entitlement',
    type: 'Special',
    status: 'Active',
    objectValue: {
      details: [
        {
          carryover: false,
          prorata_method: 'NEVER',
          rounding_method: 'NONE',
          absence_type_ref: 'AbsenceType:v1:SICK',
          prolong_approval: 'MANAGER',
          validation_amount: 0,
          carryover_approval: 'NONE',
          entitlement_amount: 10,
          max_carryover_amount: 0,
          max_carryover_percent: 0,
          validation_amount_unit: 'MONTH'
        }
      ],
      year_type: 'CALENDAR_YEAR',
      full_time_unit: 'DAYS',
      year_start_date: '01.01',
      entitlement_type: 'SPECIAL',
      full_time_amount: 5,
      full_time_frequency: 'WEEK',
      advance_generation_amount: 0,
      advance_generation_time_unit: 'MONTHS'
    }
  }
]

export const defaultAbsenceTypeVersionValues: AbsenceTypeVersionFormValues = {
  code: '',
  version: '1.0',
  validFrom: '2024-01-01',
  validTo: '9999-12-31',
  colorToken: 'warning',
  measurement: 'working-days',
  behaviour: 'absence-and-time',
  priority: '',
  enteredBy: 'HR, Manager',
  substitute: false,
  relative: false,
  document: false,
  anonymous: false,
  halfDays: false,
  accessPlan: false,
  accessRequest: false
}

export const defaultAbsenceEntitlementValues: AbsenceEntitlementFormValues = {
  code: '',
  name: '',
  type: 'yearly',
  validFrom: '',
  validTo: '',
  fullTimeAmount: '',
  fullTimeUnit: 'days',
  fullTimePeriod: 'per-week',
  yearType: 'calendar-year',
  fiscalYearStart: '',
  advanceAmount: '',
  advanceUnit: 'months'
}

export const getAbsenceTypeTitle = (absenceType: AbsenceType, fallbackTitle: string): string =>
  absenceType.value || absenceType.code || fallbackTitle

export const getAbsenceGroupLabel = (parentEntryId: string | undefined, fallbackNoGroup: string): string => {
  if (!parentEntryId) {
    return fallbackNoGroup
  }

  const groupCode = parentEntryId.split(':').pop()?.trim()
  if (!groupCode) {
    return fallbackNoGroup
  }

  return groupCode
    .replaceAll(/[-_]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}
