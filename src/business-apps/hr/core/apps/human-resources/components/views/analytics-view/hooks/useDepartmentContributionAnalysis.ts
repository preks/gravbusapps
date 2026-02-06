import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * Dataset response type for department contribution analysis query
 */
type DatasetRow = {
  department_id?: string
  department_name?: string
  first_month_salary?: number
  percentage?: number
  growth_percentage?: number
  category?: string
  value?: number
  [key: string]: any
}

/**
 * Department contribution analysis data structure
 */
export interface DepartmentContributionData {
  departmentId: string
  departmentName: string
  currentSalary: number
  firstMonthSalary: number
  percentage: number
  growthPercentage: number
}

/**
 * Hook to fetch department contribution analysis from dataset API
 * Uses the departmentContributionAnalysis query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the range (YYYY-MM-DD)
 * @param endDate - End date for the range (YYYY-MM-DD)
 * @returns Object containing department contribution data, loading state, error, and refetch function
 */
export const useDepartmentContributionAnalysis = (accessToken: string, startDate: string, endDate: string) => {
  const [data, setData] = useState<DepartmentContributionData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useDepartmentContributionAnalysis] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the dataset query with date parameters
      const params = {
        startDate: startDate || dayjs().startOf('year').format('YYYY-MM-DD'),
        endDate: endDate || dayjs().endOf('year').format('YYYY-MM-DD')
      }

      const ds = await datasetClient.executeQuery('departmentContributionAnalysis', QueryType.DATASET, params)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useDepartmentContributionAnalysis] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Transform dataset rows to DepartmentContributionData format
      const contributionData: DepartmentContributionData[] = rows
        .map((row: DatasetRow) => {
          const departmentId = String(row.department_id || 'unknown')
          const departmentName = String(row.department_name || row.category || 'Unknown')
          const currentSalary = Number(row.value ?? 0)
          const firstMonthSalary = Number(row.first_month_salary ?? 0)
          const percentage = Number(row.percentage ?? 0)
          const growthPercentage = Number(row.growth_percentage ?? 0)

          return {
            departmentId,
            departmentName,
            currentSalary,
            firstMonthSalary,
            percentage,
            growthPercentage
          }
        })
        .filter((item: DepartmentContributionData) => item.departmentId !== 'unknown') // Filter out invalid departments
        .sort((a: DepartmentContributionData, b: DepartmentContributionData) => b.currentSalary - a.currentSalary) // Sort by current salary descending

      if (isMounted.current) {
        setData(contributionData)
        setError(null)
      }
    } catch (err) {
      console.error('[useDepartmentContributionAnalysis] Error fetching department contribution analysis:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useDepartmentContributionAnalysis] Failed to fetch department contribution analysis')
        )
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, startDate, endDate])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch
  }
}
