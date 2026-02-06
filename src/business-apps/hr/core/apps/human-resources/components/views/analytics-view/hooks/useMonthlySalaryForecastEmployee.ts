import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * Dataset response type for monthly salary forecast query
 */
type DatasetRow = {
  category?: string
  value?: number
  headcount?: number
  new_hires?: number
  [key: string]: any
}

/**
 * Monthly salary forecast data structure
 */
export interface MonthlySalaryForecastData {
  month: string // e.g. '2026-01'
  totalSalary: number
  headcount: number
  newHires: number
}

/**
 * Hook to fetch monthly salary forecast data from dataset API
 * Uses the monthlySalaryForecastEmployee query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the forecast range (YYYY-MM-DD)
 * @param endDate - End date for the forecast range (YYYY-MM-DD)
 * @returns Object containing forecast data, loading state, error, and refetch function
 */
export const useMonthlySalaryForecastEmployee = (accessToken: string, startDate: string, endDate: string) => {
  const [data, setData] = useState<MonthlySalaryForecastData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useMonthlySalaryForecastEmployee] No access token provided'))
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
        startDate: startDate || dayjs().startOf('month').format('YYYY-MM-DD'),
        endDate: endDate || dayjs().endOf('month').add(11, 'month').format('YYYY-MM-DD')
      }

      const ds = await datasetClient.executeQuery('monthlySalaryForecastEmployee', QueryType.TIMESERIES, params)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useMonthlySalaryForecastEmployee] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Transform dataset rows to MonthlySalaryForecastData format
      // Format: category (YYYY-MM), value (total salary), headcount, new_hires
      const forecastData: MonthlySalaryForecastData[] = rows
        .map((row: DatasetRow) => {
          const month = String(row.category || row.date_category || '')
          const totalSalary = Number(row.value ?? 0)
          const headcount = Number(row.headcount ?? 0)
          const newHires = Number(row.new_hires ?? 0)

          return {
            month,
            totalSalary,
            headcount,
            newHires
          }
        })
        .filter((item: MonthlySalaryForecastData) => item.month) // Filter out invalid months
        .sort((a: MonthlySalaryForecastData, b: MonthlySalaryForecastData) => a.month.localeCompare(b.month)) // Sort by month

      if (isMounted.current) {
        setData(forecastData)
        setError(null)
      }
    } catch (err) {
      console.error('[useMonthlySalaryForecastEmployee] Error fetching monthly salary forecast:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useMonthlySalaryForecastEmployee] Failed to fetch monthly salary forecast')
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
