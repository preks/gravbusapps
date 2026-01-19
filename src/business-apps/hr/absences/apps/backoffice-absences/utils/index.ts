/**
 * Utility functions for Backoffice Absences Dashboard
 * Contains reusable helper functions used throughout the app
 */

// Currency utility functions
export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR'
}

export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount)
}

// Date utility functions
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateFull = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Department statistics utilities
export const groupAbsencesByDepartment = (absences: any[]) => {
  const departmentMap = new Map<string, { id: string; name: string; absences: any[]; employees: Set<string> }>()

  absences.forEach(absence => {
    const orgUnitId = absence.employee?.employeePosition?.organizationalUnit?.id || 'no-department'
    const orgUnitName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department'

    if (!departmentMap.has(orgUnitId)) {
      departmentMap.set(orgUnitId, {
        id: orgUnitId,
        name: orgUnitName,
        absences: [],
        employees: new Set()
      })
    }

    const dept = departmentMap.get(orgUnitId)!
    dept.absences.push(absence)
    if (absence.employee?.id) {
      dept.employees.add(absence.employee.id)
    }
  })

  return Array.from(departmentMap.values())
    .map(dept => {
      // Use effectiveDays consistently across dashboard and details
      const totalDays = dept.absences.reduce(
        (sum: number, absence: any) => sum + (Number(absence.effectiveDays) || 0),
        0
      )
      const uniqueEmployees = dept.employees.size
      const totalRequests = dept.absences.length

      return {
        id: dept.id,
        name: dept.name,
        totalDays,
        uniqueEmployees,
        avgDaysPerEmployee: uniqueEmployees > 0 ? Math.round((totalDays / uniqueEmployees) * 100) / 100 : 0,
        avgRequestsPerEmployee: uniqueEmployees > 0 ? Math.round((totalRequests / uniqueEmployees) * 100) / 100 : 0,
        totalRequests
      }
    })
    .sort((a, b) => b.totalDays - a.totalDays)
}

// Monthly trends utilities
export const groupAbsencesByMonth = (absences: any[], timeFilter?: string) => {
  const monthMap = new Map()

  // ✅ Determine the target year only for 'current-year' view (used for labeling)
  const currentYear = new Date().getFullYear()
  const filterYear = timeFilter === 'current-year' ? currentYear : null

  // Helper: iterate months spanned by [start,end] and apply a callback
  const forEachMonthInRange = (start: Date, end: Date, cb: (year: number, month: number) => void) => {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 0, 0, 0, 0))
    const endMonthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 0, 0, 0, 0))
    while (cursor <= endMonthStart) {
      cb(cursor.getUTCFullYear(), cursor.getUTCMonth())
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
  }

  absences.forEach(absence => {
    const startDate = new Date(absence.startDate)
    const endDate = new Date(absence.endDate)

    // Normalize to UTC month starts
    const rangeStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1, 0, 0, 0, 0))
    const rangeEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1, 0, 0, 0, 0))

    forEachMonthInRange(rangeStart, rangeEnd, (year, month) => {
      // If filtering to current year, skip months outside it
      if (filterYear && year !== filterYear) {
        return
      }

      const monthName = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'short' })
      const sortKey = `${year}-${month.toString().padStart(2, '0')}`

      if (!monthMap.has(sortKey)) {
        monthMap.set(sortKey, {
          month: monthName,
          year,
          monthNumber: month,
          sortKey,
          absences: [],
          employees: new Set(),
          typeBreakdown: {},
          uniqueAbsenceIds: new Set<string>(),
          into: 0,
          out: 0
        })
      }

      const monthData = monthMap.get(sortKey)
      // Guard: ensure day-level overlap with this month (use UTC to avoid TZ drift)
      const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
      if (!(startDate <= monthEnd && endDate >= monthStart)) {
        return
      }
      const absenceId = absence.id || `${absence.employee?.id || 'unknown'}:${absence.startDate}:${absence.endDate}`
      if (!monthData.uniqueAbsenceIds.has(absenceId)) {
        monthData.uniqueAbsenceIds.add(absenceId)
        monthData.absences.push(absence)
        if (absence?.employee?.id) {
          monthData.employees.add(absence.employee.id)
        }
        const groupName = absence.groupName || 'Unknown Group'
        monthData.typeBreakdown[groupName] = (monthData.typeBreakdown[groupName] || 0) + 1
      }

      // INTO: absence starts before month and ends inside month
      const startsBeforeMonth = startDate < monthStart
      const endsInMonth = endDate >= monthStart && endDate <= monthEnd
      const startsInMonth = startDate >= monthStart && startDate <= monthEnd
      const endsAfterMonth = endDate > monthEnd
      if (startsBeforeMonth && endsInMonth) {
        monthData.into += 1
      }
      // OUT: absence starts inside month and ends after month
      if (startsInMonth && endsAfterMonth) {
        monthData.out += 1
      }
    })
  })

  const sortedMonthData = Array.from(monthMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const years = Array.from(new Set(sortedMonthData.map((d: any) => d.year)))
  const includeYear = years.length > 1

  return sortedMonthData.map((monthData: any) => {
    const totalRequests = monthData.uniqueAbsenceIds ? monthData.uniqueAbsenceIds.size : monthData.absences.length
    const uniqueEmployees = monthData.employees.size
    const totalDuration = monthData.absences.reduce(
      (sum: number, absence: any) => sum + (Number(absence.effectiveDays) || 0),
      0
    )

    const displayMonth = includeYear ? `${monthData.month} ${monthData.year}` : monthData.month

    return {
      month: displayMonth,
      total: totalRequests,
      totalRequests,
      uniqueEmployees,
      avgRequestsPerEmployee: uniqueEmployees > 0 ? Math.round((totalRequests / uniqueEmployees) * 100) / 100 : 0,
      avgDurationPerRequest: totalRequests > 0 ? Math.round((totalDuration / totalRequests) * 100) / 100 : 0,
      totalDuration,
      typeBreakdown: monthData.typeBreakdown,
      into: monthData.into,
      out: monthData.out
    }
  })
}

// Color utilities for charts (ONLY for data visualizations)
export const getAbsenceGroupColor = (groupName: string): string => {
  const colorMap: Record<string, string> = {
    Vacation: 'var(--nw-chart-1)',
    'Sick Leave': 'var(--nw-chart-2)',
    'Special Leave': 'var(--nw-chart-3)',
    'Work Leave': 'var(--nw-chart-4)',
    'Unknown Group': 'var(--nw-chart-5)'
  }

  return colorMap[groupName] || 'var(--nw-chart-6)'
}

// Vacation entitlements utilities (UPDATED - new calculation logic)
export const calculateVacationMetrics = (
  entitlements: any[],
  activeEmployeesCount: number = 0,
  vacationAbsenceBalance: number = 0
) => {
  if (entitlements.length === 0 || activeEmployeesCount === 0) {
    return {
      averageVacationDays: 0,
      averageUsed: 0,
      averagePending: 0,
      totalVacationLiability: 0,
      totalActiveEmployees: activeEmployeesCount,
      averageAvailable: 0
    }
  }

  const totals = entitlements.reduce(
    (acc, entitlement) => ({
      total: acc.total + (entitlement.total || 0),
      used: acc.used + (entitlement.approved || 0),
      pending: acc.pending + (entitlement.pending || 0)
    }),
    { total: 0, used: 0, pending: 0 }
  )

  // NEW LOGIC: Total vacation days = sum of total field from absence entitlements table (only for AbsenceType:v1:A001)
  const totalVacationDays = totals.total // Sum of total field from entitlements
  const totalVacationEntitlement = totals.total // Same as total vacation days
  const averageVacationPerEmployee = entitlements.length > 0 ? totals.total / entitlements.length : 0

  // NEW LOGIC: Average used per employee = total balance days from EmployeeAbsence / number of active employees
  const averageUsed = activeEmployeesCount > 0 ? vacationAbsenceBalance / activeEmployeesCount : 0
  const averagePending = Math.round((totals.pending / entitlements.length) * 100) / 100

  // Calculate total liability (remaining vacation days) = sum of balance field from employee_absence
  const totalRemaining = vacationAbsenceBalance // Sum of balance field from EmployeeAbsence table

  // NEW LOGIC: Average available per employee = total vacation days / number of active employees
  const averageAvailable = activeEmployeesCount > 0 ? totalVacationDays / activeEmployeesCount : 0

  return {
    averageVacationDays: Math.round(averageVacationPerEmployee * 100) / 100,
    averageUsed: Math.round(averageUsed * 100) / 100,
    averagePending,
    averageAvailable: Math.round(averageAvailable * 100) / 100,
    totalActiveEmployees: activeEmployeesCount,
    totalVacationLiability: totalRemaining,
    totalVacationEntitlement: Math.round(totalVacationEntitlement * 100) / 100
  }
}

// Navigation utilities
export const getMonthDateRange = (month: string, year: number = new Date().getFullYear()) => {
  const monthIndex = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ].findIndex(m => m.startsWith(month.substring(0, 3)))

  if (monthIndex === -1) return null

  // Calculate start and end dates using UTC to avoid timezone issues
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999))

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}

// ✅ Server-Side Aggregation Utilities
export { processCompleteServerSideAggregations } from './serverSideAggregationUtils'
