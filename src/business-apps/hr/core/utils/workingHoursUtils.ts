type WorkingHoursPeriod = {
  activeFrom?: string | null
  activeTo?: string | null
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
