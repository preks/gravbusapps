import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { formatDate, getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

/**
 * GraphQL response type for combined turnover metrics
 */
type TimeseriesRow = { category?: string; date_category?: string; dateCategory?: string; value?: number }

/**
 * Hook to calculate the turnover rate for the current month and MoM change.
 * - Numerator: terminations (distinct employees) within period
 * - Denominator: average headcount over the period = (start + end) / 2
 */
export const useTurnoverRate = (accessToken: string) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  // Define all hooks at the top level to ensure consistent order
  const [rate, setRate] = useState<number>(0)
  const [terminatedCount, setTerminatedCount] = useState<number>(0)
  const [change, setChange] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  /**
   * Get date ranges for current full month and previous full month
   */
  const getCurrentAndPreviousMonthRanges = useCallback(() => {
    const now = dayjs()
    const currentStart = formatDate(now.startOf('month').toDate(), 'fullDateTime.ISO') as string
    const currentEnd = formatDate(now.endOf('month').toDate(), 'fullDateTime.ISO') as string

    const prev = now.subtract(1, 'month')
    const previousStart = formatDate(prev.startOf('month').toDate(), 'fullDateTime.ISO') as string
    const previousEnd = formatDate(prev.endOf('month').toDate(), 'fullDateTime.ISO') as string

    return {
      current: { startDate: currentStart, endDate: currentEnd },
      previous: { startDate: previousStart, endDate: previousEnd }
    }
  }, [])

  const calculateTurnoverRate = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Use monthlyTurnoverRatePercentage timeseries (already percentage)
      // Range: previous month start -> current month end
      const prevMonthStart = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
      const currMonthEnd = dayjs().endOf('month').format('YYYY-MM-DD')

      const structureId = getCurrentActiveStructureId()
      const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
      const params: Record<string, string | number | boolean> = { startDate: prevMonthStart, endDate: currMonthEnd }
      if (structureId) params.structureId = structureId
      if (companyIdsParam) params.companyIds = companyIdsParam

      const resp = await datasetClient.executeQuery('monthlyTurnoverRatePercentage', QueryType.TIMESERIES, params)

      const rows = ((resp?.data as TimeseriesRow[]) ?? []).slice().sort((a, b) => {
        const ad = dayjs((a.dateCategory ?? a.date_category) || '').valueOf()
        const bd = dayjs((b.dateCategory ?? b.date_category) || '').valueOf()
        return ad - bd
      })

      const latest = rows[rows.length - 1]
      const previous = rows[rows.length - 2]

      const roundedCurrent = Number(latest?.value ?? 0)
      const roundedPrevious = Number(previous?.value ?? 0)
      const changeValue = Math.round((roundedCurrent - roundedPrevious) * 10) / 10

      if (isMounted.current) {
        // Not available from this dataset; keep 0 for compatibility
        setTerminatedCount(0)
        setRate(roundedCurrent)
        setChange(changeValue)
        setError(null)
      }
    } catch (err) {
      console.error('[useTurnoverRate] Error calculating turnover rate:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to calculate turnover rate'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, getCurrentAndPreviousMonthRanges, selectedCompanyIds])

  useEffect(() => {
    isMounted.current = true
    calculateTurnoverRate()
    return () => {
      isMounted.current = false
    }
  }, [calculateTurnoverRate])

  const refetch = useCallback(() => {
    calculateTurnoverRate()
  }, [calculateTurnoverRate])

  return { rate, terminatedCount, change, loading, error, refetch }
}
