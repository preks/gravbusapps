import dayjs from 'dayjs'
import {
  AbsenceRecord,
  AbsenceBalance,
  AbsenceType,
  AbsenceGroup,
  AbsenceStatistics,
  AbsenceChartData,
  AbsenceTableData
} from '../types/absenceTypes'
import {
  AbsenceDataResponse,
  AbsenceBalanceResponse,
  AbsenceTypesResponse,
  AbsenceGroupsResponse
} from '../../../../queries/AbsenceQueries'

export const transformAbsenceData = (
  absenceResponse: AbsenceDataResponse,
  balanceResponse: AbsenceBalanceResponse,
  typesResponse: AbsenceTypesResponse,
  groupsResponse: AbsenceGroupsResponse
): {
  absenceData: AbsenceRecord[]
  balanceData: AbsenceBalance[]
  absenceTypes: AbsenceType[]
  absenceGroups: AbsenceGroup[]
} => {
  // Create lookup maps for types and groups
  const absenceTypes: AbsenceType[] = typesResponse.CatalogEntry.map(entry => ({
    id: entry.id,
    code: entry.code,
    value: entry.value,
    parentEntryId: entry.parentEntryId
  }))

  const absenceGroups: AbsenceGroup[] = groupsResponse.CatalogEntry.map(entry => ({
    id: entry.id,
    code: entry.code,
    value: entry.value
  }))

  const typeMap = new Map(absenceTypes.map(type => [type.id, type]))
  const groupMap = new Map(absenceGroups.map(group => [group.id, group]))

  // Helper function to find type and group
  const findAbsenceTypeAndGroup = (
    businessKey: string | null
  ): { type: AbsenceType | null; group: AbsenceGroup | null } => {
    if (!businessKey) return { type: null, group: null }

    const type = typeMap.get(businessKey)
    if (!type) return { type: null, group: null }

    const group = type.parentEntryId ? groupMap.get(type.parentEntryId) || null : null
    return { type, group }
  }

  // Transform absence data
  const absenceData: AbsenceRecord[] = absenceResponse.EmployeeAbsence.map(absence => {
    const { type, group } = findAbsenceTypeAndGroup(absence.businessKey)

    return {
      id: absence.id,
      activeFrom: absence.activeFrom,
      activeTo: absence.activeTo,
      effectiveDays: absence.effectiveDays,
      calendarDays: absence.calendarDays,
      description: absence.description,
      businessKey: absence.businessKey,
      createdAt: absence.createdAt,
      employee: {
        id: absence.employee.id,
        firstName: absence.employee.firstName,
        lastName: absence.employee.lastName,
        businessKey: absence.employee.businessKey,
        displayName: `${absence.employee.firstName} ${absence.employee.lastName}`
      },
      absenceType: type,
      absenceGroup: group,
      month: dayjs(absence.createdAt).format('MMM'),
      year: dayjs(absence.createdAt).year(),
      employeeAbsenceRecords: absence.employeeAbsenceRecords
    }
  })

  // Transform balance data
  const balanceData: AbsenceBalance[] = balanceResponse.EmployeeAbsenceBalance.map(balance => {
    const { type, group } = findAbsenceTypeAndGroup(balance.businessKey)

    return {
      id: balance.id,
      absenceYear: balance.absenceYear,
      annualTotal: balance.annualTotal,
      approved: balance.approved,
      pending: balance.pending,
      planned: balance.planned,
      remaining: balance.remaining,
      carryover: balance.carryover,
      businessKey: balance.businessKey,
      employee: {
        id: balance.employee.id,
        firstName: balance.employee.firstName,
        lastName: balance.employee.lastName,
        businessKey: balance.employee.businessKey,
        displayName: `${balance.employee.firstName} ${balance.employee.lastName}`
      },
      absenceType: type,
      absenceGroup: group
    }
  })

  return { absenceData, balanceData, absenceTypes, absenceGroups }
}

export const calculateAbsenceStatistics = (
  absenceData: AbsenceRecord[],
  balanceData: AbsenceBalance[],
  absenceGroups: AbsenceGroup[]
): AbsenceStatistics => {
  const totalEmployees = new Set(absenceData.map(a => a.employee.id)).size
  const totalAbsenceDays = absenceData.reduce((sum, a) => sum + a.effectiveDays, 0)

  // Calculate dynamically by group
  const groupStats = absenceGroups.map(group => {
    const groupAbsences = absenceData.filter(a => a.absenceGroup?.id === group.id)
    const totalDays = groupAbsences.reduce((sum, a) => sum + a.effectiveDays, 0)
    const employeeCount = new Set(groupAbsences.map(a => a.employee.id)).size

    return {
      groupCode: group.code,
      groupName: group.value,
      totalDays,
      usagePercentage: totalAbsenceDays > 0 ? Math.round((totalDays / totalAbsenceDays) * 100) : 0,
      employeeCount
    }
  })

  // Calculate totals dynamically - find the most common groups
  const groupDaysMap = new Map<string, number>()
  absenceData.forEach(absence => {
    if (absence.absenceGroup) {
      const current = groupDaysMap.get(absence.absenceGroup.code) || 0
      groupDaysMap.set(absence.absenceGroup.code, current + absence.effectiveDays)
    }
  })

  // Get the first two groups by usage (likely vacation and sick)
  const sortedGroups = Array.from(groupDaysMap.entries()).sort((a, b) => b[1] - a[1])
  const primaryGroupCode = sortedGroups[0]?.[0]
  const secondaryGroupCode = sortedGroups[1]?.[0]

  const totalVacationDays = primaryGroupCode ? groupDaysMap.get(primaryGroupCode) || 0 : 0
  const totalSickDays = secondaryGroupCode ? groupDaysMap.get(secondaryGroupCode) || 0 : 0
  const totalSpecialLeaveDays = sortedGroups[2] ? sortedGroups[2][1] : 0
  const totalWorkLeaveDays = sortedGroups[3] ? sortedGroups[3][1] : 0

  // Calculate usage percentages from balance data dynamically
  const primaryGroupBalances = balanceData.filter(b => b.absenceGroup?.code === primaryGroupCode)
  const secondaryGroupBalances = balanceData.filter(b => b.absenceGroup?.code === secondaryGroupCode)

  const totalAnnualPrimary = primaryGroupBalances.reduce((sum, b) => sum + b.annualTotal, 0)
  const totalAnnualSecondary = secondaryGroupBalances.reduce((sum, b) => sum + b.annualTotal, 0)

  const vacationUsagePercentage =
    totalAnnualPrimary > 0 ? Math.round((totalVacationDays / totalAnnualPrimary) * 100) : 0

  const sickUsagePercentage = totalAnnualSecondary > 0 ? Math.round((totalSickDays / totalAnnualSecondary) * 100) : 0

  const averageDaysUsed = totalEmployees > 0 ? Math.round((totalAbsenceDays / totalEmployees) * 10) / 10 : 0

  // Calculate type stats dynamically (all absence types with usage)
  const typeStatsMap = new Map<string, any>()
  absenceData.forEach(absence => {
    if (absence.absenceType) {
      const key = absence.absenceType.code
      if (!typeStatsMap.has(key)) {
        typeStatsMap.set(key, {
          typeCode: absence.absenceType.code,
          typeName: absence.absenceType.value,
          groupCode: absence.absenceGroup?.code || 'Unknown',
          totalDays: 0,
          employeeIds: new Set()
        })
      }
      const typeStat = typeStatsMap.get(key)
      typeStat.totalDays += absence.effectiveDays
      typeStat.employeeIds.add(absence.employee.id)
    }
  })

  const typeStats = Array.from(typeStatsMap.values()).map(stat => ({
    typeCode: stat.typeCode,
    typeName: stat.typeName,
    groupCode: stat.groupCode,
    totalDays: stat.totalDays,
    usagePercentage: totalAbsenceDays > 0 ? Math.round((stat.totalDays / totalAbsenceDays) * 100) : 0,
    employeeCount: stat.employeeIds.size
  }))

  return {
    totalEmployees,
    totalAbsenceDays,
    vacationUsagePercentage,
    sickUsagePercentage,
    averageDaysUsed,
    totalVacationDays,
    totalSickDays,
    totalSpecialLeaveDays,
    totalWorkLeaveDays,
    groupStats,
    typeStats
  }
}

import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export const generateChartData = (
  absenceData: AbsenceRecord[],
  balanceData: AbsenceBalance[],
  absenceGroups: AbsenceGroup[]
): AbsenceChartData => {
  const locale = getCurrentActiveUserLocale() || 'en-US'
  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString(locale, { month: 'short' })
  )

  // Create dynamic monthly usage by group
  const monthlyMap = new Map<string, Record<string, number>>()

  months.forEach(month => {
    const monthData: Record<string, number> = { month: month as any }
    absenceGroups.forEach(group => {
      monthData[group.code] = 0
    })
    monthlyMap.set(month, monthData)
  })

  absenceData.forEach(absence => {
    const monthData = monthlyMap.get(absence.month)
    if (monthData && absence.absenceGroup) {
      monthData[absence.absenceGroup.code] += absence.effectiveDays
    }
  })

  const monthlyUsageByGroup = Array.from(monthlyMap.values()).map(monthData => {
    // Convert to the expected format - take first 4 groups and map to expected names
    const groupEntries = Object.entries(monthData).filter(([key]) => key !== 'month')
    const result: any = { month: monthData.month }

    groupEntries.slice(0, 4).forEach(([days], index) => {
      const fieldNames = ['vacation', 'sickLeave', 'specialLeave', 'workLeave']
      result[fieldNames[index] || `group${index}`] = days
    })

    // Fill missing fields with 0
    ;['vacation', 'sickLeave', 'specialLeave', 'workLeave'].forEach(field => {
      if (!(field in result)) {
        result[field] = 0
      }
    })

    return result
  })

  // Total absence days by month
  const totalAbsenceDays = months.map(month => {
    const monthAbsences = absenceData.filter(a => a.month === month)
    const days = monthAbsences.reduce((sum, a) => sum + a.effectiveDays, 0)
    return { month, days }
  })

  // Dynamic colors for groups - using design system chart tokens
  const generateColor = (index: number): string => {
    const colors = [
      'var(--nw-chart-1)',
      'var(--nw-chart-2)',
      'var(--nw-chart-3)',
      'var(--nw-chart-4)',
      'var(--nw-chart-5)',
      'var(--nw-chart-6)',
      'var(--nw-chart-7)',
      'var(--nw-chart-8)'
    ]
    return colors[index % colors.length]
  }

  // Absence by group with dynamic colors
  const absenceByGroup = absenceGroups
    .map((group, index) => {
      const groupAbsences = absenceData.filter(a => a.absenceGroup?.id === group.id)
      const days = groupAbsences.reduce((sum, a) => sum + a.effectiveDays, 0)
      return {
        group: group.value,
        days,
        percentage: 0, // Will be calculated below
        color: generateColor(index)
      }
    })
    .filter(item => item.days > 0)

  const totalGroupDays = absenceByGroup.reduce((sum, g) => sum + g.days, 0)
  absenceByGroup.forEach(group => {
    group.percentage = totalGroupDays > 0 ? Math.round((group.days / totalGroupDays) * 100) : 0
  })

  // Absence by type (top 10 most used types)
  const typeMap = new Map<string, any>()
  absenceData.forEach(absence => {
    if (absence.absenceType) {
      const key = absence.absenceType.value
      if (!typeMap.has(key)) {
        typeMap.set(key, {
          type: absence.absenceType.value,
          group: absence.absenceGroup?.value || 'Unknown',
          days: 0
        })
      }
      typeMap.get(key)!.days += absence.effectiveDays
    }
  })

  const absenceByType = Array.from(typeMap.values())
    .sort((a, b) => b.days - a.days)
    .slice(0, 10)
    .map(type => ({
      ...type,
      percentage: totalGroupDays > 0 ? Math.round((type.days / totalGroupDays) * 100) : 0
    }))

  // Generate department breakdown from actual employee data (no mock data)
  const employeeOrgMap = new Map<string, any>()
  absenceData.forEach(absence => {
    const empId = absence.employee.id
    if (!employeeOrgMap.has(empId)) {
      // Use first 3 chars of employee ID as department proxy
      const deptCode = absence.employee.businessKey?.substring(0, 3) || absence.employee.id.substring(0, 3)
      employeeOrgMap.set(empId, {
        department: `Dept-${deptCode}`,
        groupTotals: new Map<string, number>()
      })
    }

    const empData = employeeOrgMap.get(empId)
    const groupCode = absence.absenceGroup?.code || 'Other'
    const current = empData.groupTotals.get(groupCode) || 0
    empData.groupTotals.set(groupCode, current + absence.effectiveDays)
  })

  // Aggregate by department
  const deptMap = new Map<string, any>()
  employeeOrgMap.forEach(empData => {
    if (!deptMap.has(empData.department)) {
      deptMap.set(empData.department, {
        department: empData.department,
        groupTotals: new Map<string, number>()
      })
    }

    const deptData = deptMap.get(empData.department)
    empData.groupTotals.forEach((days: number, groupCode: string) => {
      const current = deptData.groupTotals.get(groupCode) || 0
      deptData.groupTotals.set(groupCode, current + days)
    })
  })

  const departmentBreakdown = Array.from(deptMap.values())
    .map(dept => {
      const result: any = { department: dept.department }

      // Map first 4 groups to expected field names
      const groupCodes = Array.from(dept.groupTotals.keys()).slice(0, 4)
      const fieldNames = ['vacation', 'sickLeave', 'specialLeave', 'workLeave']

      let total = 0
      groupCodes.forEach((groupCode, index) => {
        const days = dept.groupTotals.get(groupCode) || 0
        result[fieldNames[index] || `group${index}`] = days
        total += days
      })

      // Fill missing fields with 0
      fieldNames.forEach(field => {
        if (!(field in result)) {
          result[field] = 0
        }
      })

      result.total = total
      return result
    })
    .filter(dept => dept.total > 0)

  return {
    monthlyUsageByGroup,
    totalAbsenceDays,
    absenceByGroup,
    absenceByType,
    departmentBreakdown
  }
}

export const generateTableData = (
  absenceData: AbsenceRecord[],
  balanceData: AbsenceBalance[],
  absenceTypes: AbsenceType[],
  absenceGroups: AbsenceGroup[]
): AbsenceTableData => {
  // Generate cost center data from actual employee data (no mock data)
  const costCenterMap = new Map<string, any>()

  absenceData.forEach(absence => {
    // Use business key or ID prefix as cost center proxy
    const costCenter = absence.employee.businessKey?.substring(0, 6) || `CC-${absence.employee.id.substring(0, 6)}`

    if (!costCenterMap.has(costCenter)) {
      costCenterMap.set(costCenter, {
        costCenter,
        groupTotals: new Map<string, number>()
      })
    }

    const ccData = costCenterMap.get(costCenter)
    const groupCode = absence.absenceGroup?.code || 'Other'
    const current = ccData.groupTotals.get(groupCode) || 0
    ccData.groupTotals.set(groupCode, current + absence.effectiveDays)
  })

  const byCostCenter = Array.from(costCenterMap.values())
    .map(cc => {
      const result: any = { costCenter: cc.costCenter }

      // Map groups to expected field names
      const groupCodes = Array.from(cc.groupTotals.keys()).slice(0, 4)
      const fieldNames = ['vacation', 'sickLeave', 'specialLeave', 'workLeave']

      let total = 0
      groupCodes.forEach((groupCode, index) => {
        const days = cc.groupTotals.get(groupCode) || 0
        result[fieldNames[index] || `group${index}`] = days
        total += days
      })

      // Fill missing fields with 0
      fieldNames.forEach(field => {
        if (!(field in result)) {
          result[field] = 0
        }
      })

      result.total = total
      return result
    })
    .filter(cc => cc.total > 0)

  // Employee summary
  const employeeMap = new Map<string, any>()

  absenceData.forEach(absence => {
    const empId = absence.employee.id
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee: absence.employee,
        totalDays: 0,
        groupTotals: new Map<string, number>(),
        balanceMap: new Map()
      })
    }

    const empData = employeeMap.get(empId)
    empData.totalDays += absence.effectiveDays

    const groupCode = absence.absenceGroup?.code || 'Other'
    const current = empData.groupTotals.get(groupCode) || 0
    empData.groupTotals.set(groupCode, current + absence.effectiveDays)
  })

  // Add balance data
  balanceData.forEach(balance => {
    const empId = balance.employee.id
    if (employeeMap.has(empId) && balance.absenceType) {
      const empData = employeeMap.get(empId)
      empData.balanceMap.set(balance.absenceType.value, {
        type: balance.absenceType.value,
        allocated: balance.annualTotal,
        used: balance.approved,
        remaining: balance.remaining
      })
    }
  })

  const byEmployee = Array.from(employeeMap.values()).map(emp => {
    const balanceInfo = Array.from(emp.balanceMap.values()) as Array<{
      type: string
      allocated: number
      used: number
      remaining: number
    }>

    const totalAllocated = balanceInfo.reduce((sum, bal) => sum + bal.allocated, 0)

    // Map group totals to expected field names
    const result: any = {
      employee: emp.employee,
      totalDays: emp.totalDays,
      balanceInfo
    }

    const groupCodes = Array.from(emp.groupTotals.keys()).slice(0, 4)
    const fieldNames = ['vacation', 'sickLeave', 'specialLeave', 'workLeave']

    groupCodes.forEach((groupCode, index) => {
      const days = emp.groupTotals.get(groupCode) || 0
      result[fieldNames[index] || `group${index}`] = days
    })

    // Fill missing fields with 0
    fieldNames.forEach(field => {
      if (!(field in result)) {
        result[field] = 0
      }
    })

    result.usagePercentage = totalAllocated > 0 ? Math.round((emp.totalDays / totalAllocated) * 100) : 0

    return result
  })

  // Absence type analysis
  const byAbsenceType = absenceTypes
    .map(type => {
      const typeAbsences = absenceData.filter(a => a.absenceType?.id === type.id)
      const totalDays = typeAbsences.reduce((sum, a) => sum + a.effectiveDays, 0)
      const employeeCount = new Set(typeAbsences.map(a => a.employee.id)).size
      const group = absenceGroups.find(g => g.id === type.parentEntryId)

      return {
        type,
        group: group || { id: '', code: 'Unknown', value: 'Unknown' },
        totalDays,
        employeeCount,
        averageDaysPerEmployee: employeeCount > 0 ? Math.round((totalDays / employeeCount) * 10) / 10 : 0
      }
    })
    .filter(item => item.totalDays > 0)
    .sort((a, b) => b.totalDays - a.totalDays)

  return {
    byCostCenter,
    byEmployee,
    byAbsenceType
  }
}
