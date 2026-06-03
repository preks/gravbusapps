export interface AnalyticsWorkingConditionPeriod {
  employeeId?: string | null
  activeFrom?: string | null
  activeTo?: string | null
}

export function toDateKey(value: Date | string): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }

  return value.slice(0, 10)
}

function isActiveOnDate<T extends AnalyticsWorkingConditionPeriod>(
  workingCondition: T,
  targetDateKey: string
): boolean {
  const activeFromKey = workingCondition.activeFrom ? toDateKey(workingCondition.activeFrom) : ''
  const activeToKey = workingCondition.activeTo ? toDateKey(workingCondition.activeTo) : ''

  if (!activeFromKey) {
    return false
  }

  return activeFromKey <= targetDateKey && (!activeToKey || activeToKey >= targetDateKey)
}

function sortActiveWorkingConditions<T extends AnalyticsWorkingConditionPeriod>(left: T, right: T): number {
  const leftActiveFrom = left.activeFrom ? toDateKey(left.activeFrom) : ''
  const rightActiveFrom = right.activeFrom ? toDateKey(right.activeFrom) : ''

  return rightActiveFrom.localeCompare(leftActiveFrom)
}

export function selectReportingWorkingCondition<T extends AnalyticsWorkingConditionPeriod>(
  workingConditions: T[],
  reportingDate: Date | string = new Date()
): T | undefined {
  if (workingConditions.length === 0) {
    return undefined
  }

  if (workingConditions.length === 1) {
    return workingConditions[0]
  }

  const reportingDateKey = toDateKey(reportingDate)
  return workingConditions
    .filter(condition => isActiveOnDate(condition, reportingDateKey))
    .sort(sortActiveWorkingConditions)[0]
}

export function selectReportingWorkingConditionsByEmployee<T extends AnalyticsWorkingConditionPeriod>(
  workingConditions: T[],
  reportingDate: Date | string = new Date()
): T[] {
  const recordsByEmployeeId = new Map<string, T[]>()

  workingConditions.forEach(workingCondition => {
    const employeeId = workingCondition.employeeId

    if (!employeeId) {
      return
    }

    const employeeRecords = recordsByEmployeeId.get(employeeId) || []
    employeeRecords.push(workingCondition)
    recordsByEmployeeId.set(employeeId, employeeRecords)
  })

  return Array.from(recordsByEmployeeId.values())
    .map(employeeRecords => selectReportingWorkingCondition(employeeRecords, reportingDate))
    .filter((workingCondition): workingCondition is T => Boolean(workingCondition))
}
