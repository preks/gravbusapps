export interface WorkingConditionWithHireDate {
  hireDate?: string | null
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

const formatLocalDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseDateKey = (value?: string | null): string | null => {
  const trimmedValue = value?.trim()
  if (!trimmedValue) {
    return null
  }

  const dateKeyMatch = DATE_KEY_PATTERN.exec(trimmedValue)
  if (dateKeyMatch) {
    return dateKeyMatch[0]
  }

  const parsedDate = new Date(trimmedValue)
  return Number.isNaN(parsedDate.getTime()) ? null : formatLocalDateKey(parsedDate)
}

const getHireDateKeys = (workingConditions?: WorkingConditionWithHireDate[] | null): string[] =>
  (workingConditions ?? [])
    .map(workingCondition => parseDateKey(workingCondition.hireDate))
    .filter((hireDateKey): hireDateKey is string => Boolean(hireDateKey))

export const hasWorkingConditionHireDateStarted = (
  workingConditions?: WorkingConditionWithHireDate[] | null,
  today = new Date()
): boolean => {
  const earliestHireDate = getHireDateKeys(workingConditions).sort((left, right) => left.localeCompare(right))[0]

  return !earliestHireDate || earliestHireDate <= formatLocalDateKey(today)
}
