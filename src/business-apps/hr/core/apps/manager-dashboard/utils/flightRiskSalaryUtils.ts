import { ProcessedSalaryChange, RawSalaryRecord } from '../types/flightRisk.types'

export interface EmployeeSalaryInfo {
  salaryChanges: ProcessedSalaryChange[]
  currentSalary?: number
  currentCurrencyCode?: string
  teamMedianSalary?: number
}

const sortSalaryRecordsByRecency = (records: RawSalaryRecord[]): RawSalaryRecord[] => {
  return [...records].sort((a, b) => {
    const startDateA = a.startDate ? new Date(a.startDate).getTime() : 0
    const startDateB = b.startDate ? new Date(b.startDate).getTime() : 0

    if (startDateA !== startDateB) {
      return startDateB - startDateA
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export const getSalaryCurrencyCode = (record: RawSalaryRecord): string | undefined => {
  return record.currency?.code || record.currency?.value || undefined
}

export const getSalaryAmount = (record: RawSalaryRecord): number => {
  if (record.annualGrossSalary != null && record.annualGrossSalary > 0) {
    return record.annualGrossSalary
  }
  if (record.monthlyGrossSalary != null && record.monthlyGrossSalary > 0) {
    return record.monthlyGrossSalary * 12
  }
  if (record.hourlyGrossSalary != null && record.hourlyGrossSalary > 0) {
    return record.hourlyGrossSalary * 2080
  }

  return 0
}

export const isActiveSalary = (record: RawSalaryRecord, today: Date): boolean => {
  if (!record.startDate) return false

  const startDate = new Date(record.startDate)
  if (startDate > today) return false

  if (!record.endDate) return true

  return new Date(record.endDate) >= today
}

export const processSalaryChanges = (records: RawSalaryRecord[]): ProcessedSalaryChange[] => {
  if (records.length === 0) return []

  const sortedRecords = sortSalaryRecordsByRecency(records)
  const changes: ProcessedSalaryChange[] = []

  for (let index = 0; index < sortedRecords.length; index += 1) {
    const currentRecord = sortedRecords[index]
    const previousRecord = sortedRecords[index + 1]
    const currentCurrencyCode = getSalaryCurrencyCode(currentRecord) || 'EUR'
    const previousCurrencyCode = previousRecord ? getSalaryCurrencyCode(previousRecord) : undefined
    const canCompareWithPrevious = previousRecord && previousCurrencyCode === currentCurrencyCode
    const previousAmount = canCompareWithPrevious ? getSalaryAmount(previousRecord) : null
    const newAmount = getSalaryAmount(currentRecord)

    let changePercent: number | null = null
    if (previousAmount != null && previousAmount > 0 && newAmount > 0) {
      changePercent = ((newAmount - previousAmount) / previousAmount) * 100
    }

    changes.push({
      id: currentRecord.id,
      employeeId: currentRecord.employeeId,
      previousAmount,
      newAmount,
      changePercent,
      currencyCode: currentCurrencyCode,
      effectiveDate: currentRecord.startDate || currentRecord.createdAt,
      reason: currentRecord.salaryAdjustReasonRef || undefined
    })
  }

  return changes
}

const calculateMedian = (amounts: number[]): number => {
  if (amounts.length === 0) return 0

  const sortedAmounts = [...amounts].sort((a, b) => a - b)
  const middleIndex = Math.floor(sortedAmounts.length / 2)

  if (sortedAmounts.length % 2 === 1) {
    return sortedAmounts[middleIndex]
  }

  return (sortedAmounts[middleIndex - 1] + sortedAmounts[middleIndex]) / 2
}

export const calculateTeamMedianSalaryByCurrency = (
  allSalaryRecords: RawSalaryRecord[],
  today: Date
): Map<string, number> => {
  const recordsByEmployee = new Map<string, RawSalaryRecord[]>()
  allSalaryRecords.forEach(record => {
    const existingRecords = recordsByEmployee.get(record.employeeId) || []
    existingRecords.push(record)
    recordsByEmployee.set(record.employeeId, existingRecords)
  })

  const salariesByCurrency = new Map<string, number[]>()
  recordsByEmployee.forEach(records => {
    const activeRecord = sortSalaryRecordsByRecency(records).find(record => isActiveSalary(record, today))
    if (!activeRecord) return

    const currentCurrencyCode = getSalaryCurrencyCode(activeRecord)
    const amount = getSalaryAmount(activeRecord)
    if (!currentCurrencyCode || amount <= 0) return

    const existingAmounts = salariesByCurrency.get(currentCurrencyCode) || []
    existingAmounts.push(amount)
    salariesByCurrency.set(currentCurrencyCode, existingAmounts)
  })

  const mediansByCurrency = new Map<string, number>()
  salariesByCurrency.forEach((amounts, currencyCode) => {
    mediansByCurrency.set(currencyCode, calculateMedian(amounts))
  })

  return mediansByCurrency
}

export const groupSalaryDataByEmployee = (
  allSalaryRecords: RawSalaryRecord[],
  today: Date,
  teamMedianByCurrency: Map<string, number>
): Map<string, EmployeeSalaryInfo> => {
  const salaryMap = new Map<string, EmployeeSalaryInfo>()
  const recordsByEmployee = new Map<string, RawSalaryRecord[]>()

  allSalaryRecords.forEach(record => {
    const existingRecords = recordsByEmployee.get(record.employeeId) || []
    existingRecords.push(record)
    recordsByEmployee.set(record.employeeId, existingRecords)
  })

  recordsByEmployee.forEach((records, employeeId) => {
    const sortedRecords = sortSalaryRecordsByRecency(records)
    const activeRecord = sortedRecords.find(record => isActiveSalary(record, today))
    const currentSalary = activeRecord ? getSalaryAmount(activeRecord) : undefined
    const currentCurrencyCode = activeRecord ? getSalaryCurrencyCode(activeRecord) : undefined

    salaryMap.set(employeeId, {
      salaryChanges: processSalaryChanges(records),
      currentSalary,
      currentCurrencyCode,
      teamMedianSalary: currentCurrencyCode ? teamMedianByCurrency.get(currentCurrencyCode) : undefined
    })
  })

  return salaryMap
}
