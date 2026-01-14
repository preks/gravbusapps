import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

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

        // Dedupe by token and date range
        const fetchKey = `${context.accessToken}|${startDateStr}|${endDate}`
        if (!force && lastFetchKeyRef.current === fetchKey) {
          setIsLoading(false)
          return
        }
        lastFetchKeyRef.current = fetchKey

        console.log('[useHeadcountTrendsData] Using date range:', dateParams)

        // Execute all headcount queries in parallel
        const [currentHeadcountData, headcountTimeData, hiresData, exitsData, netChangeData, departmentData] =
          await Promise.all([
            // Current total headcount (Query 17) - authoritative source
            queryClient.executeQuery('totalEmployeeCount', QueryType.DATASET, {}),

            // Total headcount over time (Query 20) - with date parameters
            queryClient.executeQuery('totalHeadcountOverTime', QueryType.TIMESERIES, dateParams),

            // Monthly hires (Query 18) - with date parameters
            queryClient.executeQuery('hiresPerMonth', QueryType.TIMESERIES, dateParams),

            // Monthly exits (Query 19) - with date parameters
            queryClient.executeQuery('exitsPerMonth', QueryType.TIMESERIES, dateParams),

            // Net headcount change (Query 22) - with date parameters
            queryClient.executeQuery('netHeadcountChange', QueryType.TIMESERIES, dateParams),

            // Employees by department (existing Query 6)
            queryClient.executeQuery('employeesByDepartment', QueryType.DATASET, {})
          ])

        console.log('[useHeadcountTrendsData] Query results:', {
          currentHeadcount: currentHeadcountData.data?.length,
          headcountOverTime: headcountTimeData.data?.length,
          monthlyHires: hiresData.data?.length,
          monthlyExits: exitsData.data?.length,
          netChange: netChangeData.data?.length,
          departmentData: departmentData.data?.length
        })

        // Log raw data for debugging
        console.log('[useHeadcountTrendsData] Raw data samples:', {
          headcountSample: headcountTimeData.data?.slice(0, 2),
          hiresSample: hiresData.data?.slice(0, 2),
          exitsSample: exitsData.data?.slice(0, 2),
          netChangeSample: netChangeData.data?.slice(0, 2)
        })

        const loadedData: HeadcountTrendsData = {
          currentHeadcount:
            currentHeadcountData.data?.map(item => ({
              category: item.category,
              value: item.value
            })) || [],
          headcountOverTime:
            headcountTimeData.data?.map(item => ({
              category: item.category,
              dateCategory: item.dateCategory || '',
              value: item.value
            })) || [],
          monthlyHires:
            hiresData.data?.map(item => ({
              category: item.category,
              dateCategory: item.dateCategory || '',
              value: item.value
            })) || [],
          monthlyExits:
            exitsData.data?.map(item => ({
              category: item.category,
              dateCategory: item.dateCategory || '',
              value: item.value
            })) || [],
          netChange:
            netChangeData.data?.map(item => ({
              category: item.category,
              dateCategory: item.dateCategory || '',
              value: item.value
            })) || [],
          departmentData:
            departmentData.data?.map(item => ({
              category: item.category,
              value: item.value
            })) || []
        }

        console.log('[useHeadcountTrendsData] Transformed data:', {
          headcountOverTime: loadedData.headcountOverTime.length,
          monthlyHires: loadedData.monthlyHires.length,
          monthlyExits: loadedData.monthlyExits.length,
          netChange: loadedData.netChange.length
        })

        setData(loadedData)
        setStatistics(calculateStatistics(loadedData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load headcount data')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, calculateStatistics]
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
