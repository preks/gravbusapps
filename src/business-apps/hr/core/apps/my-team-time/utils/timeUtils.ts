import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { WeeklyWorkingHours } from '../types/types'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const parseDateInput = (dateInput: string): Date => {
  const match = DATE_ONLY_PATTERN.exec(dateInput)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  return new Date(dateInput)
}

export const parseDurationToMinutes = (duration?: string | null): number => {
  if (!duration) return 0
  const str = String(duration).trim()
  if (!str) return 0

  let cleaned = str
  const negative = cleaned.startsWith('-')
  if (negative) cleaned = cleaned.slice(1).trim()

  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [hours, minutes] = cleaned.split(':').map(Number)
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const total = hours * 60 + minutes
      return negative ? -total : total
    }
  }

  let total = 0
  const tokens = cleaned.split(/\s+/)
  for (const token of tokens) {
    if (/^\d+h$/i.test(token)) {
      total += (Number.parseInt(token.slice(0, -1), 10) || 0) * 60
    } else if (/^\d+m$/i.test(token)) {
      total += Number.parseInt(token.slice(0, -1), 10) || 0
    }
  }

  return negative ? -total : total
}

export const formatMinutes = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0 && m === 0) return '0h'
  if (m === 0) return `${sign}${h}h`
  if (h === 0) return `${sign}${m}m`
  return `${sign}${h}h ${m}m`
}

export const formatHoursDecimal = (minutes: number): string => {
  return (minutes / 60).toFixed(1)
}

export const toLocalDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const toDateString = (d: Date): string => toLocalDateKey(d)

export const getPlannedMinutesForDate = (dateIso: string, workingHours?: WeeklyWorkingHours): number => {
  if (!workingHours) return 0
  const d = parseDateInput(dateIso)
  const day = d.getDay()
  const hoursByDay = [
    workingHours.sundayHours,
    workingHours.mondayHours,
    workingHours.tuesdayHours,
    workingHours.wednesdayHours,
    workingHours.thursdayHours,
    workingHours.fridayHours,
    workingHours.saturdayHours
  ]
  const hours = hoursByDay[day] ?? 0
  return typeof hours === 'number' ? Math.max(0, Math.round(hours * 60)) : 0
}

export const isWorkingDay = (dateIso: string, workingHours?: WeeklyWorkingHours): boolean => {
  return getPlannedMinutesForDate(dateIso, workingHours) > 0
}

export const formatTimeShort = (isoString: string): string => {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const getLocationLabel = (location?: string): string => {
  switch (location) {
    case 'IS_NEAR_HOME':
      return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.location_home', 'Home')
    case 'IS_NEAR_OFFICE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.location_office', 'Office')
    case 'IS_OTHER_LOCATION':
      return getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.location_remote', 'Remote')
    default:
      return '—'
  }
}

const SICK_TYPE_REFS = ['ILLNESS', 'SICK', 'SICK_LEAVE']
const HEALTH_GROUP = 'AbsenceGroup:v1:HEALTH'

export const isSickAbsence = (typeRef: string, parentEntryId?: string): boolean => {
  if (parentEntryId === HEALTH_GROUP) return true
  const upper = typeRef.toUpperCase()
  return SICK_TYPE_REFS.some(ref => upper.includes(ref))
}
