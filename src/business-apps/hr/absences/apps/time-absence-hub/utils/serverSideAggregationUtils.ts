import { DashboardData } from '../types'
import { groupAbsencesByDepartment, groupAbsencesByMonth, calculateVacationMetrics } from './index'
import { calculateWorkingDays as calculateVacationWorkingDays } from '@/business-apps/hr/absences/utils/vacationCalculations'
import { safeCurrencyExtraction } from '@/common/utils/numberFormatter'

type CatalogCurrency = {
  id?: string | null
  code?: string | null
  value?: string | null
}

type SalaryRow = {
  employeeId?: string
  annualGrossSalary?: number | null
  monthlyGrossSalary?: number | null
  hourlyGrossSalary?: number | null
  currencyRef?: string | null
  currency?: CatalogCurrency | null
}

type EmployeePositionRow = {
  employee?: { id?: string | null } | null
  companyId?: string | null
  company?: {
    currencyRef?: string | null
    currency?: CatalogCurrency | null
  } | null
}

type FinancialImpactMetrics = {
  estimatedCostPerDay: number
  totalLiabilityEstimate: number
  currencyCode: string
  hasMultipleCurrencies: boolean
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
const ACTIVE_ABSENCE_STATUSES = new Set(['APPROVED', 'PENDING'])

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

const buildLatestSalaryByEmployee = (salaryRows: SalaryRow[]): Map<string, SalaryRow> => {
  const latestSalaryByEmployee = new Map<string, SalaryRow>()
  salaryRows.forEach(row => {
    const employeeId = String(row?.employeeId ?? '')
    if (!employeeId || latestSalaryByEmployee.has(employeeId)) {
      return
    }
    latestSalaryByEmployee.set(employeeId, row)
  })
  return latestSalaryByEmployee
}

const resolveCatalogCurrencyCode = (currency?: CatalogCurrency | null, currencyRef?: string | null): string | null => {
  const fromCatalog = safeCurrencyExtraction(currency)
  if (fromCatalog) {
    return fromCatalog
  }

  const fromRef = safeCurrencyExtraction(currencyRef)
  if (fromRef) {
    return fromRef
  }

  if (currency?.id) {
    return safeCurrencyExtraction(currency.id)
  }

  return null
}

const resolveSalaryCurrencyCode = (salaryRow: SalaryRow): string | null =>
  resolveCatalogCurrencyCode(salaryRow.currency, salaryRow.currencyRef)

const buildEmployeeCompanyCurrencyByEmployeeId = (employeePositions: EmployeePositionRow[]): Map<string, string> => {
  const companyCurrencyByEmployeeId = new Map<string, string>()

  employeePositions.forEach(position => {
    const employeeId = String(position?.employee?.id ?? '')
    if (!employeeId || companyCurrencyByEmployeeId.has(employeeId)) {
      return
    }

    const companyCurrency = resolveCatalogCurrencyCode(position.company?.currency, position.company?.currencyRef)
    if (companyCurrency) {
      companyCurrencyByEmployeeId.set(employeeId, companyCurrency)
    }
  })

  return companyCurrencyByEmployeeId
}

const collectScopedCurrencyCodes = (
  liabilityEmployeeIds: Set<string>,
  latestSalaryByEmployee: Map<string, SalaryRow>,
  employeeCompanyCurrencyByEmployeeId: Map<string, string>
): Set<string> => {
  const currencyCodes = new Set<string>()

  liabilityEmployeeIds.forEach(employeeId => {
    const salaryRow = latestSalaryByEmployee.get(employeeId)
    if (salaryRow && getAnnualSalaryAmount(salaryRow) > 0) {
      const salaryCurrency = resolveSalaryCurrencyCode(salaryRow)
      if (salaryCurrency) {
        currencyCodes.add(salaryCurrency)
        return
      }
    }

    const companyCurrency = employeeCompanyCurrencyByEmployeeId.get(employeeId)
    if (companyCurrency) {
      currencyCodes.add(companyCurrency)
    }
  })

  return currencyCodes
}

const buildFinancialImpactInputs = (
  remainingByEmployee: Map<string, number>,
  latestSalaryByEmployee: Map<string, SalaryRow>
): {
  employeesWithSalary: Array<{ remainingDays: number; salaryRow: SalaryRow }>
} => {
  const employeesWithSalary: Array<{ remainingDays: number; salaryRow: SalaryRow }> = []

  remainingByEmployee.forEach((remainingDays, employeeId) => {
    const salaryRow = latestSalaryByEmployee.get(employeeId)
    if (!salaryRow) {
      return
    }

    if (getAnnualSalaryAmount(salaryRow) <= 0) {
      return
    }

    employeesWithSalary.push({ remainingDays, salaryRow })
  })

  return { employeesWithSalary }
}

const calculateFinancialImpactMetrics = (
  remainingByEmployee: Map<string, number>,
  salaryRows: SalaryRow[],
  employeeCompanyCurrencyByEmployeeId: Map<string, string>
): FinancialImpactMetrics => {
  const emptyMetrics: FinancialImpactMetrics = {
    estimatedCostPerDay: 0,
    totalLiabilityEstimate: 0,
    currencyCode: 'EUR',
    hasMultipleCurrencies: false
  }

  if (remainingByEmployee.size === 0 || salaryRows.length === 0) {
    return emptyMetrics
  }

  const liabilityEmployeeIds = new Set(remainingByEmployee.keys())
  const relevantSalaryRows = salaryRows.filter(row => {
    const employeeId = String(row?.employeeId ?? '')
    return employeeId.length > 0 && liabilityEmployeeIds.has(employeeId)
  })

  if (relevantSalaryRows.length === 0) {
    return emptyMetrics
  }

  const latestSalaryByEmployee = buildLatestSalaryByEmployee(relevantSalaryRows)
  const scopedCurrencyCodes = collectScopedCurrencyCodes(
    liabilityEmployeeIds,
    latestSalaryByEmployee,
    employeeCompanyCurrencyByEmployeeId
  )

  if (scopedCurrencyCodes.size > 1) {
    return {
      estimatedCostPerDay: 0,
      totalLiabilityEstimate: 0,
      currencyCode: '',
      hasMultipleCurrencies: true
    }
  }

  const { employeesWithSalary } = buildFinancialImpactInputs(remainingByEmployee, latestSalaryByEmployee)

  if (employeesWithSalary.length === 0) {
    return emptyMetrics
  }

  const workingDaysPerYear = getWorkingDaysPerYear()
  let totalCostPerDay = 0
  let totalLiabilityEstimate = 0

  employeesWithSalary.forEach(({ remainingDays, salaryRow }) => {
    const annualSalary = getAnnualSalaryAmount(salaryRow)
    const dailyCost = annualSalary / workingDaysPerYear
    totalCostPerDay += dailyCost
    totalLiabilityEstimate += dailyCost * remainingDays
  })

  const currencyCode = scopedCurrencyCodes.size === 1 ? Array.from(scopedCurrencyCodes)[0] : 'EUR'

  return {
    estimatedCostPerDay: Math.round((totalCostPerDay / employeesWithSalary.length) * 100) / 100,
    totalLiabilityEstimate: Math.round(totalLiabilityEstimate * 100) / 100,
    currencyCode,
    hasMultipleCurrencies: false
  }
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

export const processCompleteServerSideAggregations = (
  aggregationResult: any,
  absenceGroups: Record<string, string>,
  timeFilter: string,
  hasPopulationFilter = false
): DashboardData => {
  const approvedCount = aggregationResult.approvedAbsences?.aggregate?.count || 0
  const pendingCount = aggregationResult.pendingAbsences?.aggregate?.count || 0
  const rejectedCount = aggregationResult.rejectedAbsences?.aggregate?.count || 0
  const cancelledCount = aggregationResult.cancelledAbsences?.aggregate?.count || 0

  const allAbsencesCount = aggregationResult.totalAbsences?.aggregate?.count || 0
  const activeAbsencesCount = aggregationResult.activeAbsences?.aggregate?.count ?? approvedCount + pendingCount

  const statusBreakdown = [
    {
      status: 'APPROVED',
      count: approvedCount,
      totalDays: aggregationResult.approvedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: allAbsencesCount > 0 ? Math.round((approvedCount / allAbsencesCount) * 100) : 0
    },
    {
      status: 'PENDING',
      count: pendingCount,
      totalDays: aggregationResult.pendingAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: allAbsencesCount > 0 ? Math.round((pendingCount / allAbsencesCount) * 100) : 0
    },
    {
      status: 'REJECTED',
      count: rejectedCount,
      totalDays: aggregationResult.rejectedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: allAbsencesCount > 0 ? Math.round((rejectedCount / allAbsencesCount) * 100) : 0
    },
    {
      status: 'CANCELLED',
      count: cancelledCount,
      totalDays: aggregationResult.cancelledAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: allAbsencesCount > 0 ? Math.round((cancelledCount / allAbsencesCount) * 100) : 0
    }
  ]

  const rawEntitlements = Array.isArray(aggregationResult?.EmployeeAbsenceEntitlement)
    ? aggregationResult.EmployeeAbsenceEntitlement
    : []
  const scopedEmployeePositions = Array.isArray(aggregationResult?.scopedEmployeePositions)
    ? aggregationResult.scopedEmployeePositions
    : []
  const allowedEmployeeIds = hasPopulationFilter
    ? new Set<string>(
        scopedEmployeePositions
          .map((row: EmployeePositionRow) => String(row?.employee?.id ?? ''))
          .filter((id: string) => id.length > 0)
      )
    : new Set<string>()
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
  const employeeCompanyCurrencyByEmployeeId = buildEmployeeCompanyCurrencyByEmployeeId(scopedEmployeePositions)
  const remainingByEmployee =
    scopedSnapshotRows.length > 0
      ? buildRemainingByEmployeeFromSnapshot(scopedSnapshotRows)
      : buildRemainingByEmployeeFromEntitlements(scopedEntitlements, allowedEmployeeIds)
  const financialImpactMetrics = calculateFinancialImpactMetrics(
    remainingByEmployee,
    salaryRows,
    employeeCompanyCurrencyByEmployeeId
  )

  const averageDuration = Math.round((aggregationResult.activeAbsences?.aggregate?.avg?.effectiveDays || 0) * 100) / 100

  const approvalRate = activeAbsencesCount > 0 ? Math.round((approvedCount / activeAbsencesCount) * 100) : 0

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

  const activeEnhancedAbsences = enhancedAbsences.filter((absence: any) => ACTIVE_ABSENCE_STATUSES.has(absence.status))
  const departmentStatistics = groupAbsencesByDepartment(activeEnhancedAbsences)
  const monthlyTrends = groupAbsencesByMonth(activeEnhancedAbsences, timeFilter)

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
    totalAbsences: activeAbsencesCount,
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
      currencyCode: financialImpactMetrics.currencyCode,
      hasMultipleCurrencies: financialImpactMetrics.hasMultipleCurrencies
    },

    isLoading: false,
    error: null
  }

  return result
}
