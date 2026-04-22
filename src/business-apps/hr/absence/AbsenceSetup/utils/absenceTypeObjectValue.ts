import type { AbsenceType, AbsenceTypeObjectValue } from '@/common/types/AbsenceTypeObjectType'
import type { JSONValue } from '@/common/types/i18nTypes'

export const ABSENCE_TYPE_MEASUREMENT_OPTIONS = ['WorkingDays', 'CalendarDays', 'Hours'] as const
export type AbsenceTypeMeasurementOption = (typeof ABSENCE_TYPE_MEASUREMENT_OPTIONS)[number]

export interface AbsenceTypeObjectSettings {
  icon: string
  color: string
  display: boolean
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
}

interface AbsenceTypeObjectEditorState {
  settings: AbsenceTypeObjectSettings
  extraObjectValue: AbsenceTypeObjectValue
}

export const defaultAbsenceTypeObjectSettings: AbsenceTypeObjectSettings = {
  icon: '',
  color: '',
  display: true,
  priority: '',
  measurement: 'WorkingDays',
  enableApproval: true,
  enableHalfDays: true,
  checkEntitlement: false,
  enableSubstitute: true,
  enableAttachement: false,
  requiresSubstitute: false,
  requiresAttachment: false,
  countsAsWorkingTime: false
}

const isObjectValueRecord = (value: AbsenceType['objectValue']): value is AbsenceTypeObjectValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

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
    ...extraObjectValue
  } = objectValue
  let resolvedPriority = defaultAbsenceTypeObjectSettings.priority

  if (typeof priority === 'number') {
    resolvedPriority = String(priority)
  } else if (typeof priority === 'string') {
    resolvedPriority = priority
  }

  return {
    settings: {
      color: typeof color === 'string' ? color : defaultAbsenceTypeObjectSettings.color,
      icon: typeof icon === 'string' ? icon : defaultAbsenceTypeObjectSettings.icon,
      display: typeof display === 'boolean' ? display : defaultAbsenceTypeObjectSettings.display,
      priority: resolvedPriority,
      measurement: normalizeMeasurementOption(measurement) || defaultAbsenceTypeObjectSettings.measurement,
      enableApproval:
        typeof enableApproval === 'boolean' ? enableApproval : defaultAbsenceTypeObjectSettings.enableApproval,
      enableHalfDays:
        typeof enableHalfDays === 'boolean' ? enableHalfDays : defaultAbsenceTypeObjectSettings.enableHalfDays,
      checkEntitlement:
        typeof checkEntitlement === 'boolean' ? checkEntitlement : defaultAbsenceTypeObjectSettings.checkEntitlement,
      enableSubstitute:
        typeof enableSubstitute === 'boolean' ? enableSubstitute : defaultAbsenceTypeObjectSettings.enableSubstitute,
      enableAttachement:
        typeof enableAttachement === 'boolean' ? enableAttachement : defaultAbsenceTypeObjectSettings.enableAttachement,
      requiresSubstitute:
        typeof requiresSubstitute === 'boolean'
          ? requiresSubstitute
          : defaultAbsenceTypeObjectSettings.requiresSubstitute,
      requiresAttachment:
        typeof requiresAttachment === 'boolean'
          ? requiresAttachment
          : defaultAbsenceTypeObjectSettings.requiresAttachment,
      countsAsWorkingTime:
        typeof countsAsWorkingTime === 'boolean'
          ? countsAsWorkingTime
          : defaultAbsenceTypeObjectSettings.countsAsWorkingTime
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
  priority: Number.isNaN(Number(settings.priority)) ? 0 : Number(settings.priority),
  measurement: settings.measurement,
  enableApproval: settings.enableApproval,
  enableHalfDays: settings.enableHalfDays,
  checkEntitlement: settings.checkEntitlement,
  enableSubstitute: settings.enableSubstitute,
  enableAttachement: settings.enableAttachement,
  requiresSubstitute: settings.requiresSubstitute,
  requiresAttachment: settings.requiresAttachment,
  countsAsWorkingTime: settings.countsAsWorkingTime
})
