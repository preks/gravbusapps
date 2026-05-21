import { DashboardData } from '../types'
import { groupAbsencesByDepartment, groupAbsencesByMonth, calculateVacationMetrics } from './index'
import { calculateWorkingDays as calculateVacationWorkingDays } from '@/business-apps/hr/absences/utils/vacationCalculations'

type SalaryRow = {
  employeeId?: string
  annualGrossSalary?: number | null
  monthlyGrossSalary?: number | null
  hourlyGrossSalary?: number | null
  currency?: {
    code?: string | null
    value?: string | null
  } | null
}

type FinancialImpactMetrics = {
  estimatedCostPerDay: number
  totalLiabilityEstimate: number
  currencyCode: string
}

// Mirrors the snapshot rows returned by EntitlementUsageSnapshotView. Same shape used by My Absences.
type SnapshotRow = {
  employeeId?: string | null
  typeRef?: string | null
  totalEntitlement?: number | string | null
  usedApproved?: number | string | null
  usedPending?: number | string | null
  remaining?: number | string | null
}

type SnapshotVacationMetrics = {
  averageVacationDays: number
  averageUsed: number
  averagePending: number
  averageAvailable: number
  totalActiveEmployees: number
  totalVacationLiability: number
  totalVacationEntitlement: number
}

const DEFAULT_WORKING_DAYS_PER_YEAR = 260

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Compute org-level vacation metrics from the EntitlementUsageSnapshotView rows.
 *
 * Matches My Absences semantics:
 *   - used      = sum(usedApproved)
 *   - pending   = sum(usedPending)
 *   - total     = sum(totalEntitlement)
 *   - available = sum(remaining) when present, else max(0, total - used - pending)
 *
 * Averages are computed per distinct employeeId.
 */
const calculateVacationMetricsFromSnapshot = (
  snapshotRows: SnapshotRow[],
  fallbackEmployeeCount: number
): SnapshotVacationMetrics => {
  const totalsByEmployee = new Map<string, { total: number; used: number; pending: number; available: number }>()

  snapshotRows.forEach(row => {
    const employeeId = String(row?.employeeId ?? '')
    if (!employeeId) {
      return
    }

    const total = toNumber(row.totalEntitlement)
    const used = toNumber(row.usedApproved)
    const pending = toNumber(row.usedPending)
    const rawRemaining = toNumber(row.remaining)
    const available = rawRemaining > 0 ? rawRemaining : Math.max(0, total - used - pending)

    const existing = totalsByEmployee.get(employeeId) || { total: 0, used: 0, pending: 0, available: 0 }
    existing.total += total
    existing.used += used
    existing.pending += pending
    existing.available += available
    totalsByEmployee.set(employeeId, existing)
  })

  const employeesCount = totalsByEmployee.size > 0 ? totalsByEmployee.size : fallbackEmployeeCount
  if (employeesCount === 0) {
    return {
      averageVacationDays: 0,
      averageUsed: 0,
      averagePending: 0,
      averageAvailable: 0,
      totalActiveEmployees: fallbackEmployeeCount,
      totalVacationLiability: 0,
      totalVacationEntitlement: 0
    }
  }

  let totalEntitlement = 0
  let totalUsed = 0
  let totalPending = 0
  let totalAvailable = 0
  totalsByEmployee.forEach(entry => {
    totalEntitlement += entry.total
    totalUsed += entry.used
    totalPending += entry.pending
    totalAvailable += entry.available
  })

  return {
    averageVacationDays: round2(totalEntitlement / employeesCount),
    averageUsed: round2(totalUsed / employeesCount),
    averagePending: round2(totalPending / employeesCount),
    averageAvailable: round2(totalAvailable / employeesCount),
    totalActiveEmployees: employeesCount,
    totalVacationLiability: round2(totalAvailable),
    totalVacationEntitlement: round2(totalEntitlement)
  }
}

/**
 * Build a per-employee "remaining vacation days" map from snapshot view rows.
 * Used to compute the financial liability estimate with view-aligned semantics.
 */
const buildRemainingByEmployeeFromSnapshot = (snapshotRows: SnapshotRow[]): Map<string, number> => {
  const remainingByEmployee = new Map<string, number>()

  snapshotRows.forEach(row => {
    const employeeId = String(row?.employeeId ?? '')
    if (!employeeId) {
      return
    }

    const total = toNumber(row.totalEntitlement)
    const used = toNumber(row.usedApproved)
    const pending = toNumber(row.usedPending)
    const rawRemaining = toNumber(row.remaining)
    const available = rawRemaining > 0 ? rawRemaining : Math.max(0, total - used - pending)

    remainingByEmployee.set(employeeId, (remainingByEmployee.get(employeeId) || 0) + available)
  })

  return remainingByEmployee
}

const getRemainingEntitlementDays = (entitlement: any): number => {
  const total = Number(entitlement?.total) || 0
  const approved = Number(entitlement?.approved) || 0
  const pending = Number(entitlement?.pending) || 0
  const available =
    entitlement?.available !== undefined ? Number(entitlement.available) || 0 : total - approved - pending

  return Math.max(0, available)
}

const getAnnualSalaryAmount = (row: SalaryRow): number => {
  const annualGrossSalary = Number(row.annualGrossSalary) || 0
  if (annualGrossSalary > 0) {
    return annualGrossSalary
  }

  const monthlyGrossSalary = Number(row.monthlyGrossSalary) || 0
  if (monthlyGrossSalary > 0) {
    return monthlyGrossSalary * 12
  }

  const hourlyGrossSalary = Number(row.hourlyGrossSalary) || 0
  if (hourlyGrossSalary > 0) {
    return hourlyGrossSalary * 2080
  }

  return 0
}

const getWorkingDaysPerYear = (): number => {
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`
  const yearEnd = `${currentYear}-12-31`
  const workingDays = calculateVacationWorkingDays(yearStart, yearEnd)
  return workingDays > 0 ? workingDays : DEFAULT_WORKING_DAYS_PER_YEAR
}

const resolveCurrencyCode = (codes: string[]): string => {
  if (codes.length === 0) {
    return 'EUR'
  }

  const frequencyByCode = new Map<string, number>()
  codes.forEach(code => {
    frequencyByCode.set(code, (frequencyByCode.get(code) || 0) + 1)
  })

  return (
    Array.from(frequencyByCode.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    codes.find(code => code.trim().length > 0) ||
    'EUR'
  )
}

const buildRemainingByEmployeeFromEntitlements = (
  scopedEntitlements: any[],
  allowedEmployeeIds: Set<string>
): Map<string, number> => {
  const remainingByEmployee = new Map<string, number>()

  scopedEntitlements.forEach(entitlement => {
    const employeeId = String(entitlement?.employee?.id ?? entitlement?.employeeId ?? '')
    if (!employeeId) {
      return
    }

    if (allowedEmployeeIds.size > 0 && !allowedEmployeeIds.has(employeeId)) {
      return
    }

    const remaining = getRemainingEntitlementDays(entitlement)
    remainingByEmployee.set(employeeId, (remainingByEmployee.get(employeeId) || 0) + remaining)
  })

  return remainingByEmployee
}

const calculateFinancialImpactMetrics = (
  remainingByEmployee: Map<string, number>,
  salaryRows: SalaryRow[]
): FinancialImpactMetrics => {
  if (remainingByEmployee.size === 0 || salaryRows.length === 0) {
    return {
      estimatedCostPerDay: 0,
      totalLiabilityEstimate: 0,
      currencyCode: 'EUR'
    }
  }

  const latestSalaryByEmployee = new Map<string, SalaryRow>()
  salaryRows.forEach(row => {
    const employeeId = String(row?.employeeId ?? '')
    if (!employeeId || latestSalaryByEmployee.has(employeeId)) {
      return
    }
    latestSalaryByEmployee.set(employeeId, row)
  })

  if (latestSalaryByEmployee.size === 0) {
    return {
      estimatedCostPerDay: 0,
      totalLiabilityEstimate: 0,
      currencyCode: 'EUR'
    }
  }

  const workingDaysPerYear = getWorkingDaysPerYear()
  let totalCostPerDay = 0
  let salaryCount = 0
  let totalLiabilityEstimate = 0
  const usedCurrencyCodes: string[] = []

  remainingByEmployee.forEach((remainingDays, employeeId) => {
    const salaryRow = latestSalaryByEmployee.get(employeeId)
    if (!salaryRow) {
      return
    }

    const annualSalary = getAnnualSalaryAmount(salaryRow)
    if (annualSalary <= 0) {
      return
    }

    const dailyCost = annualSalary / workingDaysPerYear
    totalCostPerDay += dailyCost
    salaryCount += 1
    totalLiabilityEstimate += dailyCost * remainingDays

    const currencyCode = salaryRow.currency?.code || null
    if (currencyCode) {
      usedCurrencyCodes.push(currencyCode)
    }
  })

  if (salaryCount === 0) {
    return {
      estimatedCostPerDay: 0,
      totalLiabilityEstimate: 0,
      currencyCode: 'EUR'
    }
  }

  return {
    estimatedCostPerDay: Math.round((totalCostPerDay / salaryCount) * 100) / 100,
    totalLiabilityEstimate: Math.round(totalLiabilityEstimate * 100) / 100,
    currencyCode: resolveCurrencyCode(usedCurrencyCodes)
  }
}

export const processCompleteServerSideAggregations = (
  aggregationResult: any,
  absenceGroups: Record<string, string>,
  timeFilter: string
): DashboardData => {
  const approvedCount = aggregationResult.approvedAbsences?.aggregate?.count || 0
  const pendingCount = aggregationResult.pendingAbsences?.aggregate?.count || 0
  const rejectedCount = aggregationResult.rejectedAbsences?.aggregate?.count || 0
  const cancelledCount = aggregationResult.cancelledAbsences?.aggregate?.count || 0

  const totalAbsencesCount = aggregationResult.totalAbsences?.aggregate?.count || 0

  const statusBreakdown = [
    {
      status: 'APPROVED',
      count: approvedCount,
      totalDays: aggregationResult.approvedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((approvedCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'PENDING',
      count: pendingCount,
      totalDays: aggregationResult.pendingAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((pendingCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'REJECTED',
      count: rejectedCount,
      totalDays: aggregationResult.rejectedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((rejectedCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'CANCELLED',
      count: cancelledCount,
      totalDays: aggregationResult.cancelledAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((cancelledCount / totalAbsencesCount) * 100) : 0
    }
  ]

  const rawEntitlements = Array.isArray(aggregationResult?.EmployeeAbsenceEntitlement)
    ? aggregationResult.EmployeeAbsenceEntitlement
    : []
  const filteredEmployees = Array.isArray(aggregationResult?.filteredEmployees)
    ? aggregationResult.filteredEmployees
    : []
  const allowedEmployeeIds = new Set<string>(
    filteredEmployees
      .map((row: any) => row?.employee?.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  )
  const scopedEntitlements =
    allowedEmployeeIds.size > 0
      ? rawEntitlements.filter((row: any) => {
          const rowEmployeeId = String(row?.employee?.id ?? row?.employeeId ?? '')
          return allowedEmployeeIds.has(rowEmployeeId)
        })
      : rawEntitlements
  const entitlementEmployeeIds = new Set<string>(
    scopedEntitlements
      .map((row: any) => String(row?.employee?.id ?? row?.employeeId ?? ''))
      .filter((id: string) => id.length > 0)
  )
  const fallbackActiveEmployeesCount = Number(aggregationResult?.activeEmployeesCount?.aggregate?.count || 0)
  const entitlementEmployeesCount =
    entitlementEmployeeIds.size > 0 ? entitlementEmployeeIds.size : fallbackActiveEmployeesCount

  // Prefer EntitlementUsageSnapshotView (same source as My Absences). Falls back to
  // EmployeeAbsenceEntitlement-derived metrics when the view returns nothing for the
  // current scope (e.g. population filter narrows it to zero employees).
  const rawSnapshotRows: SnapshotRow[] = Array.isArray(aggregationResult?.entitlementSnapshot)
    ? aggregationResult.entitlementSnapshot
    : []
  const scopedSnapshotRows =
    allowedEmployeeIds.size > 0
      ? rawSnapshotRows.filter(row => allowedEmployeeIds.has(String(row?.employeeId ?? '')))
      : rawSnapshotRows

  const fallbackVacationMetrics = calculateVacationMetrics(scopedEntitlements, entitlementEmployeesCount)
  const snapshotVacationMetrics =
    scopedSnapshotRows.length > 0
      ? calculateVacationMetricsFromSnapshot(scopedSnapshotRows, entitlementEmployeesCount)
      : null
  const vacationMetrics = snapshotVacationMetrics ?? fallbackVacationMetrics

  const salaryRows = Array.isArray(aggregationResult?.currentSalaries) ? aggregationResult.currentSalaries : []
  const remainingByEmployee =
    scopedSnapshotRows.length > 0
      ? buildRemainingByEmployeeFromSnapshot(scopedSnapshotRows)
      : buildRemainingByEmployeeFromEntitlements(scopedEntitlements, allowedEmployeeIds)
  const financialImpactMetrics = calculateFinancialImpactMetrics(remainingByEmployee, salaryRows)

  const averageDuration = Math.round((aggregationResult.totalAbsences?.aggregate?.avg?.effectiveDays || 0) * 100) / 100

  const approvalRate = totalAbsencesCount > 0 ? Math.round((approvedCount / totalAbsencesCount) * 100) : 0

  const rawAbsences = aggregationResult?.employeeAbsences || []
  const getAbsenceGroupName = (type: any, absenceGroups: Record<string, string>): string => {
    return absenceGroups[type?.parentEntryId] || 'Other'
  }

  const enhancedAbsences = rawAbsences.map((absence: any) => {
    const groupName = getAbsenceGroupName(absence.type, absenceGroups)

    let color = 'var(--nw-chart-1)'
    const groupObjectValue = absence.type?.parentEntry?.objectValue
    if (groupObjectValue?.color) {
      const rawColor = groupObjectValue.color
      color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`
    }

    return {
      ...absence,
      groupName: groupName,
      typeName: absence.type?.value || 'Unknown',
      employeeName: absence.employee?.displayName || 'Unknown',
      departmentName: absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department',
      color: color
    }
  })

  const departmentStatistics = groupAbsencesByDepartment(enhancedAbsences)
  const monthlyTrends = groupAbsencesByMonth(enhancedAbsences, timeFilter)

  const typeBreakdown = Object.entries(
    rawAbsences.reduce((acc: any, absence: any) => {
      const groupName = getAbsenceGroupName(absence.type, absenceGroups)
      if (!acc[groupName]) {
        acc[groupName] = { count: 0, totalDays: 0, color: 'var(--nw-chart-1)' }
      }
      acc[groupName].count++
      acc[groupName].totalDays += Number(absence.effectiveDays) || 0

      const groupObjectValue = absence.type?.parentEntry?.objectValue
      if (groupObjectValue?.color) {
        const rawColor = groupObjectValue.color
        acc[groupName].color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`
      }

      return acc
    }, {})
  ).map(([type, data]: [string, any]) => ({
    type,
    count: data.count,
    totalDays: data.totalDays,
    color: data.color
  }))

  const result: DashboardData = {
    totalAbsences: totalAbsencesCount,
    pendingAbsences: pendingCount,
    approvedAbsences: approvedCount,
    rejectedAbsences: rejectedCount,
    cancelledAbsences: cancelledCount,
    averageDuration,
    approvalRate,

    ...vacationMetrics,

    statusBreakdown,
    typeBreakdown,
    departmentStats: departmentStatistics,
    monthlyData: monthlyTrends,
    rawAbsences: enhancedAbsences,

    entitlements: {
      averageVacationPerEmployee: vacationMetrics.averageVacationDays,
      totalActiveEmployees: vacationMetrics.totalActiveEmployees || 0,
      averageAvailable: vacationMetrics.averageAvailable || 0,
      averageUsed: vacationMetrics.averageUsed,
      totalVacationLiability: vacationMetrics.totalVacationLiability || 0,
      totalVacationEntitlement: vacationMetrics.totalVacationEntitlement || 0,
      estimatedCostPerDay: financialImpactMetrics.estimatedCostPerDay,
      totalLiabilityEstimate: financialImpactMetrics.totalLiabilityEstimate,
      currencyCode: financialImpactMetrics.currencyCode
    },

    isLoading: false,
    error: null
  }

  return result
}
