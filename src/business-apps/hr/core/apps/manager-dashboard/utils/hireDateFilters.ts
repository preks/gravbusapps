interface WorkingConditionWithHireDate {
  hireDate?: string | null
}

interface EmployeeWithWorkingConditions {
  workingCondition?: WorkingConditionWithHireDate[] | null
}

const toLocalDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const toComparableDateKey = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  const normalized = String(value).trim()
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized)
  if (datePrefix) {
    return `${datePrefix[1]}-${datePrefix[2]}-${datePrefix[3]}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return toLocalDateKey(parsed)
}

const getEarliestHireDate = (workingConditions?: WorkingConditionWithHireDate[] | null): string | null => {
  if (!workingConditions || workingConditions.length === 0) {
    return null
  }

  let earliestHireDate: string | null = null

  for (const workingCondition of workingConditions) {
    const hireDateKey = toComparableDateKey(workingCondition.hireDate)
    if (!hireDateKey) {
      continue
    }

    if (!earliestHireDate || hireDateKey < earliestHireDate) {
      earliestHireDate = hireDateKey
    }
  }

  return earliestHireDate
}

export const hasStartedEmployment = (employee: EmployeeWithWorkingConditions, today = new Date()): boolean => {
  const hireDate = getEarliestHireDate(employee.workingCondition)
  if (!hireDate) {
    return true
  }

  return hireDate <= toLocalDateKey(today)
}

export const filterEmployeesByStartedEmployment = <T extends EmployeeWithWorkingConditions>(
  employees: T[],
  today = new Date()
): T[] => employees.filter(employee => hasStartedEmployment(employee, today))
