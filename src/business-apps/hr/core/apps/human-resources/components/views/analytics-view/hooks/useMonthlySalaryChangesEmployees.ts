import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import dayjs from 'dayjs'

/**
 * Monthly salary change data structure
 */
export interface MonthlySalaryChange {
  month: string // e.g. '2026-01'
  change: number // month-over-month change in total salary
}

/**
 * Transform dataset rows to MonthlySalaryChange format
 */
const transformMonthlySalaryChanges = (rows: any[]): MonthlySalaryChange[] => {
  return rows
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
      } else if (row.category?.match(/^\d{4}-\d{2}$/)) {
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
  // Memoize params to avoid recreating object on every render
  const params = useMemo(
    () => ({
      startDate: startDate || dayjs().startOf('year').format('YYYY-MM-DD'),
      endDate: endDate || dayjs().endOf('year').format('YYYY-MM-DD')
    }),
    [startDate, endDate]
  )

  return useDatasetQuery<MonthlySalaryChange>(
    accessToken,
    'monthlySalaryChangesEmployees',
    QueryType.TIMESERIES,
    params,
    transformMonthlySalaryChanges,
    'useMonthlySalaryChangesEmployees'
  )
}
