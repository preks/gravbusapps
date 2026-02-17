import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import dayjs from 'dayjs'

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
 * Transform dataset rows to MonthlySalaryForecastData format
 */
const transformMonthlySalaryForecast = (rows: any[]): MonthlySalaryForecastData[] => {
  return rows
    .map((row: any) => {
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
  // Memoize params to avoid recreating object on every render
  const params = useMemo(
    () => ({
      startDate: startDate || dayjs().startOf('month').format('YYYY-MM-DD'),
      endDate: endDate || dayjs().endOf('month').add(11, 'month').format('YYYY-MM-DD')
    }),
    [startDate, endDate]
  )

  return useDatasetQuery<MonthlySalaryForecastData>(
    accessToken,
    'monthlySalaryForecastEmployee',
    QueryType.TIMESERIES,
    params,
    transformMonthlySalaryForecast,
    'useMonthlySalaryForecastEmployee'
  )
}
