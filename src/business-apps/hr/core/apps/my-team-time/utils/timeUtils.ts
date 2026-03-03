import { WeeklyWorkingHours } from '../types/types'

export const parseDurationToMinutes = (duration?: string | null): number => {
  if (!duration) return 0
  const str = String(duration).trim()
  const negative = str.startsWith('-')
  const cleaned = str.replace('-', '')
  let total = 0
  const hourMatch = cleaned.match(/(\d+)\s*h/)
  const minMatch = cleaned.match(/(\d+)\s*m/)
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 60
  if (minMatch) total += parseInt(minMatch[1], 10)
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

export const toDateString = (d: Date): string => d.toISOString().slice(0, 10)

export const getPlannedMinutesForDate = (dateIso: string, workingHours?: WeeklyWorkingHours): number => {
  if (!workingHours) return 0
  const d = new Date(dateIso)
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
      return 'Home'
    case 'IS_NEAR_OFFICE':
      return 'Office'
    case 'IS_OTHER_LOCATION':
      return 'Remote'
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
