import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'
import { fetchHeadcountMonthlyKpis } from './fetchHeadcountMonthlyKpis'

export interface HeadcountTrendsData {
  currentHeadcount: Array<{
    category: string
    value: number
  }>
  headcountOverTime: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  monthlyHires: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  monthlyExits: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  netChange: Array<{
    category: string
    dateCategory: string
    value: number
  }>
  departmentData: Array<{
    category: string
    value: number
  }>
}

export interface HeadcountStatistics {
  totalEmployees: number
  monthlyHires: number
  monthlyExits: number
  netChange: number
  growthRate: number
}

export interface UseHeadcountTrendsDataResponse {
  currentHeadcount: HeadcountTrendsData['currentHeadcount']
  headcountOverTime: HeadcountTrendsData['headcountOverTime']
  monthlyHires: HeadcountTrendsData['monthlyHires']
  monthlyExits: HeadcountTrendsData['monthlyExits']
  netChange: HeadcountTrendsData['netChange']
  departmentData: HeadcountTrendsData['departmentData']
  statistics: HeadcountStatistics
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useHeadcountTrendsData = (context: BusinessAppContextProps): UseHeadcountTrendsDataResponse => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [data, setData] = useState<HeadcountTrendsData>({
    currentHeadcount: [],
    headcountOverTime: [],
    monthlyHires: [],
    monthlyExits: [],
    netChange: [],
    departmentData: []
  })

  const [statistics, setStatistics] = useState<HeadcountStatistics>({
    totalEmployees: 0,
    monthlyHires: 0,
    monthlyExits: 0,
    netChange: 0,
    growthRate: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)
  const lastFetchKeyRef = useRef<string>('')

  const calculateStatistics = useCallback((loadedData: HeadcountTrendsData): HeadcountStatistics => {
    // Get current total headcount
    const totalEmployees = loadedData.currentHeadcount.length > 0 ? loadedData.currentHeadcount[0].value : 0

    // Get latest month's hires and exits
    const latestHires =
      loadedData.monthlyHires.length > 0 ? loadedData.monthlyHires[loadedData.monthlyHires.length - 1].value : 0

    const latestExits =
      loadedData.monthlyExits.length > 0 ? loadedData.monthlyExits[loadedData.monthlyExits.length - 1].value : 0

    const netChange = latestHires - latestExits

    // Calculate growth rate (net change as percentage of total headcount)
    const growthRate = totalEmployees > 0 ? (netChange / totalEmployees) * 100 : 0

    return {
      totalEmployees,
      monthlyHires: latestHires,
      monthlyExits: latestExits,
      netChange,
      growthRate
    }
  }, [])

  const loadHeadcountData = useCallback(
    async (force: boolean = false) => {
      if (!context.accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        // Calculate date range (last 2 years to current date)
        const endDate = new Date().toISOString().split('T')[0] // Today
        const startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 2) // 2 years ago
        const startDateStr = startDate.toISOString().split('T')[0]

        const dateParams = {
          startDate: startDateStr,
          endDate: endDate
        }
        const structureId = getCurrentActiveStructureId()
        const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
        const filterParams: Record<string, string> = {}
        if (structureId) filterParams.structureId = structureId
        if (companyIdsParam) filterParams.companyIds = companyIdsParam
        const queryParams: Record<string, string> = { ...dateParams, ...filterParams }

        // Dedupe by token and date range
        const fetchKey = `${context.accessToken}|${startDateStr}|${endDate}|${structureId ?? ''}|${companyIdsParam}`
        if (!force && lastFetchKeyRef.current === fetchKey) {
          setIsLoading(false)
          return
        }
        lastFetchKeyRef.current = fetchKey

        // Execute headcount + department queries in parallel.
        const monthlyKpisCacheKey = `${context.accessToken}|headcountMonthlyKpis|${queryParams.startDate}|${queryParams.endDate}|${queryParams.structureId ?? ''}|${queryParams.companyIds ?? ''}`
        const [currentHeadcountData, headcountMonthlyData, departmentData] = await Promise.all([
          // Current total headcount (Query 17) - authoritative source
          queryClient.executeQuery('totalEmployeeCount', QueryType.DATASET, filterParams),

          // Combined monthly headcount KPIs (headcount + hires + exits + net change)
          fetchHeadcountMonthlyKpis(queryClient, monthlyKpisCacheKey, queryParams),

          // Employees by department (existing Query 6)
          queryClient.executeQuery('employeesByDepartment', QueryType.DATASET, filterParams)
        ])

        type MonthlyKpiRow = {
          category?: string
          dateCategory?: string
          date_category?: string
          value?: number
          hires?: number
          exits?: number
          net_change?: number
          netChange?: number
          [key: string]: unknown
        }
        const monthlyRows = ((headcountMonthlyData.data ?? []) as MonthlyKpiRow[]).map(item => {
          const dateCategory = String(item.dateCategory ?? item.date_category ?? '')
          return {
            dateCategory,
            headcount: Number(item.value ?? 0),
            hires: Number(item.hires ?? 0),
            exits: Number(item.exits ?? 0),
            netChange: Number(item.net_change ?? item.netChange ?? Number(item.hires ?? 0) - Number(item.exits ?? 0))
          }
        })

        const loadedData: HeadcountTrendsData = {
          currentHeadcount:
            currentHeadcountData.data?.map(item => ({
              category: item.category,
              value: item.value
            })) || [],
          headcountOverTime: monthlyRows.map(item => ({
            category: 'Total Headcount',
            dateCategory: item.dateCategory,
            value: item.headcount
          })),
          monthlyHires: monthlyRows.map(item => ({
            category: 'New Hires',
            dateCategory: item.dateCategory,
            value: item.hires
          })),
          monthlyExits: monthlyRows.map(item => ({
            category: 'Departures',
            dateCategory: item.dateCategory,
            value: item.exits
          })),
          netChange: monthlyRows.map(item => ({
            category: 'Net Change',
            dateCategory: item.dateCategory,
            value: item.netChange
          })),
          departmentData:
            departmentData.data?.map(item => ({
              category: item.category,
              value: item.value
            })) || []
        }

        setData(loadedData)
        setStatistics(calculateStatistics(loadedData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load headcount data')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, calculateStatistics, queryClient, selectedCompanyIds]
  )

  useEffect(() => {
    if (context.accessToken) {
      loadHeadcountData(false)
    }
  }, [context.accessToken, loadHeadcountData])

  return {
    currentHeadcount: data.currentHeadcount,
    headcountOverTime: data.headcountOverTime,
    monthlyHires: data.monthlyHires,
    monthlyExits: data.monthlyExits,
    netChange: data.netChange,
    departmentData: data.departmentData,
    statistics,
    isLoading,
    error,
    refetch: () => loadHeadcountData(true)
  }
}
