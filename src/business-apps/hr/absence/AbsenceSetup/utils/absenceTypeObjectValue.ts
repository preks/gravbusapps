import type { AbsenceType, AbsenceTypeObjectValue } from '@/common/types/AbsenceTypeObjectType'
import type { JSONValue } from '@/common/types/i18nTypes'

export const ABSENCE_TYPE_ACCESS_BY_OPTIONS = ['Employee', 'Manager', 'Assistant', 'HR'] as const
export type AbsenceTypeAccessByOption = (typeof ABSENCE_TYPE_ACCESS_BY_OPTIONS)[number]

export const ABSENCE_TYPE_MEASUREMENT_OPTIONS = ['WorkingDays', 'CalendarDays', 'Hours'] as const
export type AbsenceTypeMeasurementOption = (typeof ABSENCE_TYPE_MEASUREMENT_OPTIONS)[number]

export interface AbsenceTypeObjectSettings {
  icon: string
  color: string
  display: boolean
  accessBy: AbsenceTypeAccessByOption[]
  priority: string
  measurement: AbsenceTypeMeasurementOption
  enableReason: boolean
  enableApproval: boolean
  enableHalfDays: boolean
  enableRelative: boolean
  checkEntitlement: boolean
  enableSubstitute: boolean
  enableAttachement: boolean
}

interface AbsenceTypeObjectEditorState {
  settings: AbsenceTypeObjectSettings
  extraObjectValue: AbsenceTypeObjectValue
}

export const defaultAbsenceTypeObjectSettings: AbsenceTypeObjectSettings = {
  icon: '',
  color: '',
  display: true,
  accessBy: [],
  priority: '',
  measurement: 'WorkingDays',
  enableReason: false,
  enableApproval: true,
  enableHalfDays: true,
  enableRelative: false,
  checkEntitlement: false,
  enableSubstitute: true,
  enableAttachement: false
}

const isObjectValueRecord = (value: AbsenceType['objectValue']): value is AbsenceTypeObjectValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeAccessByOption = (value: JSONValue): AbsenceTypeAccessByOption | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.replaceAll(/[\s_-]+/g, '').toLowerCase()

  if (normalizedValue === 'employee') return 'Employee'
  if (normalizedValue === 'manager') return 'Manager'
  if (normalizedValue === 'assistant') return 'Assistant'
  if (normalizedValue === 'hr') return 'HR'

  return null
}

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
    icon,
    color,
    display,
    accessBy,
    priority,
    measurement,
    enableReason,
    enableApproval,
    enableHalfDays,
    enableRelative,
    checkEntitlement,
    enableSubstitute,
    enableAttachement,
    ...extraObjectValue
  } = objectValue

  return {
    settings: {
      icon: typeof icon === 'string' ? icon : defaultAbsenceTypeObjectSettings.icon,
      color: typeof color === 'string' ? color : defaultAbsenceTypeObjectSettings.color,
      display: typeof display === 'boolean' ? display : defaultAbsenceTypeObjectSettings.display,
      accessBy: Array.isArray(accessBy)
        ? accessBy.map(normalizeAccessByOption).filter((value): value is AbsenceTypeAccessByOption => Boolean(value))
        : defaultAbsenceTypeObjectSettings.accessBy,
      priority:
        typeof priority === 'number'
          ? String(priority)
          : typeof priority === 'string'
            ? priority
            : defaultAbsenceTypeObjectSettings.priority,
      measurement: normalizeMeasurementOption(measurement) || defaultAbsenceTypeObjectSettings.measurement,
      enableReason: typeof enableReason === 'boolean' ? enableReason : defaultAbsenceTypeObjectSettings.enableReason,
      enableApproval:
        typeof enableApproval === 'boolean' ? enableApproval : defaultAbsenceTypeObjectSettings.enableApproval,
      enableHalfDays:
        typeof enableHalfDays === 'boolean' ? enableHalfDays : defaultAbsenceTypeObjectSettings.enableHalfDays,
      enableRelative:
        typeof enableRelative === 'boolean' ? enableRelative : defaultAbsenceTypeObjectSettings.enableRelative,
      checkEntitlement:
        typeof checkEntitlement === 'boolean' ? checkEntitlement : defaultAbsenceTypeObjectSettings.checkEntitlement,
      enableSubstitute:
        typeof enableSubstitute === 'boolean' ? enableSubstitute : defaultAbsenceTypeObjectSettings.enableSubstitute,
      enableAttachement:
        typeof enableAttachement === 'boolean' ? enableAttachement : defaultAbsenceTypeObjectSettings.enableAttachement
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
  accessBy: settings.accessBy,
  priority: Number.isNaN(Number(settings.priority)) ? 0 : Number(settings.priority),
  measurement: settings.measurement,
  enableReason: settings.enableReason,
  enableApproval: settings.enableApproval,
  enableHalfDays: settings.enableHalfDays,
  enableRelative: settings.enableRelative,
  checkEntitlement: settings.checkEntitlement,
  enableSubstitute: settings.enableSubstitute,
  enableAttachement: settings.enableAttachement
})
