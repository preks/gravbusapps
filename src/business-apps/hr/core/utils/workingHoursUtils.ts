type WorkingHoursPeriod = {
  activeFrom?: string | null
  activeTo?: string | null
}

type WeeklyWorkingHoursPeriod = WorkingHoursPeriod & {
  mondayHours?: number | null
  tuesdayHours?: number | null
  wednesdayHours?: number | null
  thursdayHours?: number | null
  fridayHours?: number | null
  saturdayHours?: number | null
  sundayHours?: number | null
  weeklyHours?: number | null
  weeklyDays?: number | null
}

export interface NormalizedWeeklyWorkingHours {
  activeFrom?: string | null
  activeTo?: string | null
  mondayHours: number
  tuesdayHours: number
  wednesdayHours: number
  thursdayHours: number
  fridayHours: number
  saturdayHours: number
  sundayHours: number
  weeklyHours?: number
  weeklyDays?: number
}

const toDateKey = (value?: string | Date | null): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null

    return value.toISOString().slice(0, 10)
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

const isActiveOnDate = <T extends WorkingHoursPeriod>(record: T, targetDate: string): boolean => {
  const activeFrom = toDateKey(record.activeFrom)
  const activeTo = toDateKey(record.activeTo)

  if (!activeFrom) return false

  return activeFrom <= targetDate && (!activeTo || activeTo >= targetDate)
}

const isLegacyWorkingHours = <T extends WorkingHoursPeriod>(record: T): boolean =>
  !record.activeFrom && !record.activeTo

export const getActiveWorkingHours = <T extends WorkingHoursPeriod>(
  records?: T[] | null,
  targetDate: string | Date = new Date()
): T | undefined => {
  if (!records?.length) return undefined

  if (records.length === 1) {
    return records[0]
  }

  const targetDateKey = toDateKey(targetDate)
  if (!targetDateKey) return records.find(isLegacyWorkingHours)

  return records.find(record => isActiveOnDate(record, targetDateKey)) ?? records.find(isLegacyWorkingHours)
}

export const getActiveWeeklyWorkingHours = <T extends WeeklyWorkingHoursPeriod>(
  records?: T[] | null,
  targetDate: string | Date = new Date()
): NormalizedWeeklyWorkingHours | undefined => {
  const workingHours = getActiveWorkingHours(records, targetDate)
  if (!workingHours) {
    return undefined
  }

  return {
    activeFrom: workingHours.activeFrom,
    activeTo: workingHours.activeTo,
    mondayHours: workingHours.mondayHours ?? 0,
    tuesdayHours: workingHours.tuesdayHours ?? 0,
    wednesdayHours: workingHours.wednesdayHours ?? 0,
    thursdayHours: workingHours.thursdayHours ?? 0,
    fridayHours: workingHours.fridayHours ?? 0,
    saturdayHours: workingHours.saturdayHours ?? 0,
    sundayHours: workingHours.sundayHours ?? 0,
    weeklyHours: workingHours.weeklyHours ?? undefined,
    weeklyDays: workingHours.weeklyDays ?? undefined
  }
}
