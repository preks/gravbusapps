import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * Monthly salary change data structure
 */
export interface MonthlySalaryChange {
  month: string // e.g. '2026-01'
  change: number // month-over-month change in total salary
}

/**
 * Hook to fetch monthly salary changes from dataset API
 * Uses the monthlySalaryChangesEmployees query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the range (YYYY-MM-DD)
 * @param endDate - End date for the range (YYYY-MM-DD)
 * @returns Object containing change data, loading state, error, and refetch function
 */
export const useMonthlySalaryChangesEmployees = (accessToken: string, startDate: string, endDate: string) => {
  const [data, setData] = useState<MonthlySalaryChange[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useMonthlySalaryChangesEmployees] No access token provided'))
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

      const ds = await datasetClient.executeQuery('monthlySalaryChangesEmployees', QueryType.TIMESERIES, params)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useMonthlySalaryChangesEmployees] Invalid response structure from dataset API')
      }

      // Transform dataset rows to MonthlySalaryChange format
      // Response format: dateCategory (timestamp), category (string), value (change amount)
      const changeData: MonthlySalaryChange[] = ds.data
        .map((row: any) => {
          // Extract month from dateCategory timestamp (e.g., "2026-01-01T00:00:00" -> "2026-01")
          let month = ''
          if (row.dateCategory) {
            // Parse timestamp and format as YYYY-MM
            const date = dayjs(row.dateCategory)
            month = date.isValid() ? date.format('YYYY-MM') : ''
          } else if (row.date_category) {
            const date = dayjs(row.date_category)
            month = date.isValid() ? date.format('YYYY-MM') : ''
          } else if (row.category && row.category.match(/^\d{4}-\d{2}$/)) {
            // Fallback: if category is already in YYYY-MM format
            month = row.category
          }

          const change = Number(row.value ?? 0)

          return {
            month,
            change
          }
        })
        .filter((item: MonthlySalaryChange) => item.month) // Filter out invalid months
        .sort((a: MonthlySalaryChange, b: MonthlySalaryChange) => a.month.localeCompare(b.month)) // Sort by month

      if (isMounted.current) {
        setData(changeData)
        setError(null)
      }
    } catch (err) {
      console.error('[useMonthlySalaryChangesEmployees] Error fetching monthly salary changes:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useMonthlySalaryChangesEmployees] Failed to fetch monthly salary changes')
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
