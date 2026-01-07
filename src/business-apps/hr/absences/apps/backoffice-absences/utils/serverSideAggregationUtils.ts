import { DashboardData } from '../types'
import { groupAbsencesByDepartment, groupAbsencesByMonth, calculateVacationMetrics } from './index'

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

  const rawEntitlements = aggregationResult?.EmployeeAbsenceEntitlement || []
  const activeEmployeesCount = aggregationResult?.activeEmployeesCount?.aggregate?.count || 0
  const vacationAbsenceBalance = aggregationResult?.vacationAbsenceBalance?.aggregate?.sum?.balance || 0
  const vacationMetrics = calculateVacationMetrics(rawEntitlements, activeEmployeesCount, vacationAbsenceBalance)

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
      totalVacationEntitlement: vacationMetrics.totalVacationEntitlement || 0
    },

    isLoading: false,
    error: null
  }

  return result
}
