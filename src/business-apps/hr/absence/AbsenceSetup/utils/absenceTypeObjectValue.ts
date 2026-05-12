import type { AbsenceType, AbsenceTypeObjectValue } from '@/common/types/AbsenceTypeObjectType'
import type { JSONValue } from '@/common/types/i18nTypes'

export const ABSENCE_TYPE_MEASUREMENT_OPTIONS = ['WorkingDays', 'CalendarDays', 'Hours'] as const
export type AbsenceTypeMeasurementOption = (typeof ABSENCE_TYPE_MEASUREMENT_OPTIONS)[number]

export interface AbsenceTypeObjectSettings {
  icon: string
  color: string
  display: boolean
  valid_to: string
  priority: string
  measurement: AbsenceTypeMeasurementOption
  enableApproval: boolean
  enableHalfDays: boolean
  checkEntitlement: boolean
  enableSubstitute: boolean
  enableAttachement: boolean
  requiresSubstitute: boolean
  requiresAttachment: boolean
  countsAsWorkingTime: boolean
  allowedEmploymentTypes: string[]
  allowedContractTypes: string[]
  allowedCountries: string[]
  allowedRegions: string[]
}

interface AbsenceTypeObjectEditorState {
  settings: AbsenceTypeObjectSettings
  extraObjectValue: AbsenceTypeObjectValue
}

export const defaultAbsenceTypeObjectSettings: AbsenceTypeObjectSettings = {
  icon: '',
  color: '',
  display: true,
  valid_to: '',
  priority: '',
  measurement: 'WorkingDays',
  enableApproval: true,
  enableHalfDays: true,
  checkEntitlement: false,
  enableSubstitute: true,
  enableAttachement: false,
  requiresSubstitute: false,
  requiresAttachment: false,
  countsAsWorkingTime: false,
  allowedEmploymentTypes: [],
  allowedContractTypes: [],
  allowedCountries: [],
  allowedRegions: []
}

const isObjectValueRecord = (value: AbsenceType['objectValue']): value is AbsenceTypeObjectValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toBool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const toStr = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback)

const toStrArray = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === 'string') : fallback

const normalizeMeasurementOption = (value: JSONValue): AbsenceTypeMeasurementOption | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.replaceAll(/[\s_-]+/g, '').toLowerCase()

  if (normalizedValue === 'workingdays') return 'WorkingDays'
  if (normalizedValue === 'calendardays') return 'CalendarDays'
  if (normalizedValue === 'hours') return 'Hours'

  return null
}

export const getAbsenceTypeObjectEditorState = (
  objectValue?: AbsenceType['objectValue']
): AbsenceTypeObjectEditorState => {
  if (!isObjectValueRecord(objectValue)) {
    return {
      settings: defaultAbsenceTypeObjectSettings,
      extraObjectValue: {}
    }
  }

  const {
    color,
    icon,
    display,
    valid_to,
    priority,
    measurement,
    enableApproval,
    enableHalfDays,
    checkEntitlement,
    enableSubstitute,
    enableAttachement,
    requiresSubstitute,
    requiresAttachment,
    countsAsWorkingTime,
    allowedEmploymentTypes,
    allowedContractTypes,
    allowedCountries,
    allowedRegions,
    ...extraObjectValue
  } = objectValue
  let resolvedPriority = defaultAbsenceTypeObjectSettings.priority

  if (typeof priority === 'number') {
    resolvedPriority = String(priority)
  } else if (typeof priority === 'string') {
    resolvedPriority = priority
  }

  const d = defaultAbsenceTypeObjectSettings
  return {
    settings: {
      color: toStr(color, d.color),
      icon: toStr(icon, d.icon),
      display: toBool(display, d.display),
      valid_to: toStr(valid_to, d.valid_to),
      priority: resolvedPriority,
      measurement: normalizeMeasurementOption(measurement) || d.measurement,
      enableApproval: toBool(enableApproval, d.enableApproval),
      enableHalfDays: toBool(enableHalfDays, d.enableHalfDays),
      checkEntitlement: toBool(checkEntitlement, d.checkEntitlement),
      enableSubstitute: toBool(enableSubstitute, d.enableSubstitute),
      enableAttachement: toBool(enableAttachement, d.enableAttachement),
      requiresSubstitute: toBool(requiresSubstitute, d.requiresSubstitute),
      requiresAttachment: toBool(requiresAttachment, d.requiresAttachment),
      countsAsWorkingTime: toBool(countsAsWorkingTime, d.countsAsWorkingTime),
      allowedEmploymentTypes: toStrArray(allowedEmploymentTypes, d.allowedEmploymentTypes),
      allowedContractTypes: toStrArray(allowedContractTypes, d.allowedContractTypes),
      allowedCountries: toStrArray(allowedCountries, d.allowedCountries),
      allowedRegions: toStrArray(allowedRegions, d.allowedRegions)
    },
    extraObjectValue
  }
}

export const buildAbsenceTypeObjectValue = (
  settings: AbsenceTypeObjectSettings,
  extraObjectValue: AbsenceTypeObjectValue
): AbsenceTypeObjectValue => ({
  ...extraObjectValue,
  icon: settings.icon.trim(),
  color: settings.color.trim(),
  display: settings.display,
  valid_to: settings.valid_to || undefined,
  priority: Number.isNaN(Number(settings.priority)) ? 0 : Number(settings.priority),
  measurement: settings.measurement,
  enableApproval: settings.enableApproval,
  enableHalfDays: settings.enableHalfDays,
  checkEntitlement: settings.checkEntitlement,
  enableSubstitute: settings.enableSubstitute,
  enableAttachement: settings.enableAttachement,
  requiresSubstitute: settings.requiresSubstitute,
  requiresAttachment: settings.requiresAttachment,
  countsAsWorkingTime: settings.countsAsWorkingTime,
  allowedEmploymentTypes: settings.allowedEmploymentTypes,
  allowedContractTypes: settings.allowedContractTypes,
  allowedCountries: settings.allowedCountries,
  allowedRegions: settings.allowedRegions
})
