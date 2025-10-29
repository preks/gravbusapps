import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

export interface AbsenceChartData {
  monthlyUsageByGroup: Array<{
    month: string
    [key: string]: any
  }>
  totalAbsenceDays: Array<{
    month: string
    days: number
  }>
  absenceByGroup: Array<{
    group: string
    days: number
    color?: string
  }>
  absenceByType: Array<{
    type: string
    days: number
  }>
  departmentBreakdown: Array<{
    department: string
    [key: string]: any
  }>
}

export interface AbsenceStatistics {
  totalEmployees: number
  totalAbsenceDays: number
  vacationUsagePercentage: number
  sickUsagePercentage: number
  averageDaysUsed: number
  totalVacationDays: number
  totalSickDays: number
  totalSpecialLeaveDays: number
  totalWorkLeaveDays: number
  groupStats: Array<{
    groupCode: string
    totalDays: number
  }>
  typeStats: Array<{
    typeCode: string
    totalDays: number
  }>
}

export interface AbsenceTableData {
  byCostCenter: Array<{
    id: string
    name: string
    totalDays: number
    averageDays: number
    employeeCount: number
  }>
  byEmployee: Array<{
    id: string
    name: string
    department: string
    totalDays: number
    absenceTypes: string[]
  }>
  byAbsenceType: Array<{
    id: string
    type: string
    totalDays: number
    employeeCount: number
    averageDuration: number
  }>
}

export interface UseAbsenceDataIntegrationResponse {
  absenceData: any[]
  balanceData: any[]
  absenceTypes: any[]
  absenceGroups: any[]
  statistics: AbsenceStatistics
  chartData: AbsenceChartData
  tableData: AbsenceTableData
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useAbsenceDataIntegration = (context: BusinessAppContextProps): UseAbsenceDataIntegrationResponse => {
  const [chartData, setChartData] = useState<AbsenceChartData>({
    monthlyUsageByGroup: [],
    totalAbsenceDays: [],
    absenceByGroup: [],
    absenceByType: [],
    departmentBreakdown: []
  })

  const [statistics, setStatistics] = useState<AbsenceStatistics>({
    totalEmployees: 0,
    totalAbsenceDays: 0,
    vacationUsagePercentage: 0,
    sickUsagePercentage: 0,
    averageDaysUsed: 0,
    totalVacationDays: 0,
    totalSickDays: 0,
    totalSpecialLeaveDays: 0,
    totalWorkLeaveDays: 0,
    groupStats: [],
    typeStats: []
  })

  const [tableData, setTableData] = useState<AbsenceTableData>({
    byCostCenter: [],
    byEmployee: [],
    byAbsenceType: []
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE_TIME)

  const loadAbsenceData = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Execute multiple queries in parallel to get absence data
      const currentYear = new Date().getFullYear()
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear}-12-31`

      const [monthlyData, absenceByTypeData, absenceByDepartmentData] = await Promise.all([
        // Monthly absence trend
        queryClient.executeQuery('monthlyAbsenceDays', QueryType.TIMESERIES, {
          startDate,
          endDate
        }),

        // Yearly absence data
        queryClient.executeQuery('absenceDaysPerYear', QueryType.TIMESERIES, {
          startDate: `${currentYear - 2}-01-01`,
          endDate
        }),

        // Absence by type
        queryClient.executeQuery('absenceByType', QueryType.DATASET, {
          startDate,
          endDate
        }),

        // Absence by department
        queryClient.executeQuery('absenceByDepartment', QueryType.DATASET, {
          startDate,
          endDate
        })
      ])

      // Transform monthly data for chart
      const monthlyChartData = monthlyData.data.map(item => ({
        month: item.date_category
          ? new Date(item.date_category).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })
          : 'Unknown',
        days: item.value
      }))

      // Transform absence by type data
      const absenceTypeChartData = absenceByTypeData.data.map(item => ({
        type: item.category,
        days: item.value
      }))

      // Transform department data
      const departmentChartData = absenceByDepartmentData.data.map(item => ({
        department: item.category,
        total: item.value,
        days: item.value
      }))

      // Calculate statistics
      const totalDays = absenceByTypeData.data.reduce((sum, item) => sum + item.value, 0)
      const avgDays = absenceByTypeData.data.length > 0 ? totalDays / absenceByTypeData.data.length : 0

      // Generate some mock data for groups (since we don't have group queries yet)
      const mockGroupData = [
        { group: 'Vacation', days: Math.floor(totalDays * 0.6), color: 'var(--nw-chart-1)' },
        { group: 'Sick Leave', days: Math.floor(totalDays * 0.25), color: 'var(--nw-chart-2)' },
        { group: 'Special Leave', days: Math.floor(totalDays * 0.1), color: 'var(--nw-chart-3)' },
        { group: 'Other', days: Math.floor(totalDays * 0.05), color: 'var(--nw-chart-4)' }
      ]

      setChartData({
        monthlyUsageByGroup: monthlyChartData.map(item => ({
          month: item.month,
          vacation: Math.floor(item.days * 0.6),
          sickLeave: Math.floor(item.days * 0.25),
          specialLeave: Math.floor(item.days * 0.1),
          other: Math.floor(item.days * 0.05)
        })),
        totalAbsenceDays: monthlyChartData,
        absenceByGroup: mockGroupData,
        absenceByType: absenceTypeChartData,
        departmentBreakdown: departmentChartData
      })

      setStatistics({
        totalEmployees: departmentChartData.length * 10, // Mock calculation
        totalAbsenceDays: totalDays,
        vacationUsagePercentage: 60,
        sickUsagePercentage: 25,
        averageDaysUsed: avgDays,
        totalVacationDays: Math.floor(totalDays * 0.6),
        totalSickDays: Math.floor(totalDays * 0.25),
        totalSpecialLeaveDays: Math.floor(totalDays * 0.1),
        totalWorkLeaveDays: Math.floor(totalDays * 0.05),
        groupStats: mockGroupData.map(g => ({ groupCode: g.group, totalDays: g.days })),
        typeStats: absenceTypeChartData.map(t => ({ typeCode: t.type, totalDays: t.days }))
      })

      // Mock table data
      setTableData({
        byCostCenter: departmentChartData.map((dept, index) => ({
          id: `cc-${index}`,
          name: dept.department,
          totalDays: dept.days,
          averageDays: dept.days / 10,
          employeeCount: 10
        })),
        byEmployee: [],
        byAbsenceType: absenceTypeChartData.map((type, index) => ({
          id: `at-${index}`,
          type: type.type,
          totalDays: type.days,
          employeeCount: Math.floor(type.days / 5),
          averageDuration: 5
        }))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load absence data')
    } finally {
      setIsLoading(false)
    }
  }, [queryClient, context.accessToken])

  useEffect(() => {
    if (context.accessToken) {
      loadAbsenceData()
    }
  }, [context.accessToken, loadAbsenceData])

  return {
    absenceData: [], // Legacy - will be removed
    balanceData: [], // Legacy - will be removed
    absenceTypes: [], // Legacy - will be removed
    absenceGroups: [], // Legacy - will be removed
    statistics,
    chartData,
    tableData,
    isLoading,
    error,
    refetch: loadAbsenceData
  }
}
