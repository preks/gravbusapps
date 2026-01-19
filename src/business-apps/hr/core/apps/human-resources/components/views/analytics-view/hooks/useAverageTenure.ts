import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

/**
 * Tenure representation with years and months
 */
interface Tenure {
  years: number
  months: number
}

/**
 * Hook to calculate the average tenure of all employees
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing average tenure data, loading state, and error
 */
export const useAverageTenure = (accessToken: string) => {
  const [averageTenure, setAverageTenure] = useState<Tenure>({ years: 0, months: 0 })
  const [formattedTenure, setFormattedTenure] = useState<string>('-')
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)
  const { t } = useTranslation(hrTranslations)

  // Dataset client
  const queryClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  /**
   * Format tenure into a string representation (e.g., "3.2 yrs")
   */
  const formatTenure = (tenure: Tenure): string => {
    const { years, months } = tenure

    // If less than a year, show months only
    if (years === 0) {
      return `${months} ${months === 1 ? t('hr-analytics-month-singular') : t('hr-analytics-months-plural')}`
    }

    // For more than a year, show years with decimal point
    const decimalMonths = Math.round((months / 12) * 10) / 10
    return `${years + decimalMonths} ${t('hr-analytics-years-abbr')}`
  }

  /**
   * Fetch average tenure from dataset (runner-safe) and format
   * Expects dataset 'averageEmployeeTenure' returning one row:
   *   { category: 'average_tenure_months', value: <numeric months> }
   */
  const fetchAverageTenure = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useAverageTenure] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      console.log('[useAverageTenure] Fetching average tenure from dataset')

      const ds = await queryClient.executeQuery('averageEmployeeTenure', QueryType.DATASET, {})

      const avgMonthsRaw = Array.isArray(ds?.data) && ds.data.length > 0 ? Number(ds.data[0]?.value ?? 0) : 0
      const avgMonths = Math.max(0, Math.round(avgMonthsRaw))
      const avgYears = Math.floor(avgMonths / 12)
      const avgRemainingMonths = avgMonths % 12

      const avgTenure = { years: avgYears, months: avgRemainingMonths }

      console.log(`[useAverageTenure] Calculated average tenure (dataset): ${avgYears}y ${avgRemainingMonths}m`)

      // Update state if component is still mounted
      if (isMounted.current) {
        setAverageTenure(avgTenure)
        setFormattedTenure(formatTenure(avgTenure))
        // Employee count not needed for consumers; keep 0 or extend dataset in future
        setEmployeeCount(0)
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('[useAverageTenure] Error calculating average tenure:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useAverageTenure] Failed to calculate average tenure'))
        setLoading(false)
      }
    }
  }, [accessToken, queryClient, t])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true
    fetchAverageTenure()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchAverageTenure])

  return {
    averageTenure,
    formattedTenure,
    employeeCount,
    loading,
    error
  }
}
