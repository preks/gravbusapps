import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { CatalogTranslationValues } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import type { AbsenceEntitlementObjectValue } from './absenceEntitlementObjectValue'
import { defaultAbsenceTypeObjectSettings, type AbsenceTypeObjectSettings } from './absenceTypeObjectValue'
import { getFirstDayOfCurrentMonthIso } from './absenceTypeVersionValidation'

export interface SetupSectionHighlight {
  label: string
  value: string
  display?: 'text' | 'icon' | 'color'
}

export interface SetupSectionSortOption {
  id: string
  label: string
  direction?: 'asc' | 'desc'
}

export interface SetupSectionItem {
  id: string
  title: string
  description: string
  highlights?: SetupSectionHighlight[]
  statusLabel?: string
  statusValue?: 'active' | 'inactive'
  canEdit?: boolean
  canDelete?: boolean
  searchText?: string
  sortText?: string
  sortValues?: Record<string, string | number>
  fields?: Array<{
    label: string
    value: string
  }>
  /** Optional secondary badges rendered alongside the status badge in the table row. */
  tags?: Array<{ label: string; variant?: 'default' | 'secondary' | 'outline' | 'destructive' }>
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
  translations: CatalogTranslationValues
  settings: AbsenceTypeObjectSettings
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
          max_carryover_amount: '',
          max_carryover_percent: '',
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
          max_carryover_amount: '',
          max_carryover_percent: '',
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

export const createDefaultAbsenceTypeVersionValues = (): AbsenceTypeVersionFormValues => ({
  code: '',
  version: '1.0',
  validFrom: getFirstDayOfCurrentMonthIso(),
  validTo: '',
  translations: {
    enUS: '',
    deDE: '',
    roRO: ''
  },
  settings: defaultAbsenceTypeObjectSettings
})

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
