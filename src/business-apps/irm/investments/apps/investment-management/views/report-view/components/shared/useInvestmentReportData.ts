// Shared Investment Report Data Hook
// Consolidates data fetching logic for Equity, Real Estate, and Liquid Fund tables

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports'
import { type InvestmentReportQueryVariables } from '@/common/data/investment-report/queries/investmentReportQueries'
import { transformNumberRangeFilters } from '@/common/data/investment-report/utils/filterTransformer'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

export interface UseInvestmentReportDataConfig {
  investmentGroup: 'EQUITY' | 'REAL_ESTATE' | 'LIQUID_FUND'
  filters: Record<string, any>
  investmentType?: string
  accessToken: string
  userInfo?: any
  onCurrenciesChange?: (currencies: string[]) => void
  onTotalCountChange?: (count: number, isLoading: boolean) => void
  isInitialLoad?: boolean
  // Optional: transform reports to different format (for Liquid Funds)
  dataTransformer?: (reports: any[]) => any[]
}

export interface UseInvestmentReportDataReturn {
  data: any[] // reports or transformed analytics data
  isLoading: boolean
  error: Error | null
  totalCount: number
  initialLoadDone: boolean
  refetch: () => Promise<void>
}

/**
 * Shared hook for fetching investment report data across all investment groups
 * Handles data fetching, state management, and callback stabilization
 */
export const useInvestmentReportData = (config: UseInvestmentReportDataConfig): UseInvestmentReportDataReturn => {
  const {
    investmentGroup,
    filters,
    investmentType,
    accessToken,
    userInfo,
    onCurrenciesChange,
    onTotalCountChange,
    isInitialLoad = true,
    dataTransformer
  } = config

  // State management
  const [data, setData] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initialLoadDone = useRef(false)

  // Use refs to stabilize callback props and prevent infinite loops
  const onCurrenciesChangeRef = useRef(onCurrenciesChange)
  const onTotalCountChangeRef = useRef(onTotalCountChange)

  useEffect(() => {
    onCurrenciesChangeRef.current = onCurrenciesChange
  }, [onCurrenciesChange])

  useEffect(() => {
    onTotalCountChangeRef.current = onTotalCountChange
  }, [onTotalCountChange])

  // Track initial load completion
  useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [isLoading])

  // Report loading state to parent (only report loading state during initial load)
  useEffect(() => {
    if (onTotalCountChangeRef.current) {
      const shouldReportLoading = isInitialLoad && !initialLoadDone.current && isLoading
      onTotalCountChangeRef.current(totalCount || 0, shouldReportLoading)
    }
  }, [totalCount, isLoading, isInitialLoad])

  // Use common data layer
  const { fetchInvestmentReports } = useGetInvestmentReports({ accessToken, userInfo })

  // Create stable filter key to prevent infinite loops
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  // Fetch data function
  const loadReports = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Transform number range filters before building query
      const transformedFilters = transformNumberRangeFilters(filters, INVESTMENT_REPORT_DESCRIPTORS)

      const variables: InvestmentReportQueryVariables = {
        investmentGroupIds: [`InvestmentGroup:v1:${investmentGroup}`],
        limit: 1000,
        offset: 0,
        orderBy: [{ field: 'date', direction: 'DESC' }],
        // Use transformed filters
        ...transformedFilters
      }

      // Keep existing explicit filter assignments
      if (transformedFilters.startDate) {
        variables.reportDateFrom = transformedFilters.startDate
      }
      if (transformedFilters.endDate) {
        variables.reportDateTo = transformedFilters.endDate
      }
      if (transformedFilters.currencyIds && transformedFilters.currencyIds.length > 0) {
        variables.currencyIds = transformedFilters.currencyIds
      }
      if (transformedFilters.search?.trim()) {
        variables.search = transformedFilters.search.trim()
      }
      if (investmentType && investmentType !== 'all') {
        variables.investmentTypeIds = [`InvestmentType:v1:${investmentType}`]
      }

      const { reports: fetchedReports, total } = await fetchInvestmentReports(variables)

      // Get latest report per investment
      const latestReportsByInvestment = new Map<string, any>()
      fetchedReports.forEach((report: any) => {
        const investmentId = report.investment?.id
        if (!investmentId) return

        const existingReport = latestReportsByInvestment.get(investmentId)
        if (!existingReport || new Date(report.date) > new Date(existingReport.date)) {
          latestReportsByInvestment.set(investmentId, report)
        }
      })

      const latestReports = Array.from(latestReportsByInvestment.values())

      // Apply optional data transformer (for Liquid Funds)
      const finalData = dataTransformer ? dataTransformer(latestReports) : latestReports
      setData(finalData)

      // Extract unique currency IDs from reports and notify parent
      if (onCurrenciesChangeRef.current) {
        const currencyIds = Array.from(
          new Set(
            latestReports
              .map(
                report =>
                  report.currencyRef || // InvestmentReport.currencyRef (primary)
                  report.investment?.currencyRef // Investment.currencyRef (fallback)
              )
              .filter(Boolean)
          )
        )
        onCurrenciesChangeRef.current(currencyIds)
      }

      // Derive totalCount from actual visible data to match what user sees
      // (accounts for client-side deduping and potential filtering)
      const finalCount = finalData.length || total
      setTotalCount(finalCount)

      // Report total count to parent
      if (onTotalCountChangeRef.current) {
        onTotalCountChangeRef.current(finalCount, false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load reports'))
      console.error(`Error loading ${investmentGroup.toLowerCase()} reports:`, err)
      if (onTotalCountChangeRef.current) {
        onTotalCountChangeRef.current(0, false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    userInfo,
    filterKey, // Use stable key instead of object reference to prevent infinite loops
    investmentType,
    investmentGroup,
    fetchInvestmentReports,
    dataTransformer
    // Note: onCurrenciesChange and onTotalCountChange are intentionally excluded to prevent infinite loops
    // They're accessed via refs instead
  ])

  // Load data on mount and when filters change
  useEffect(() => {
    loadReports()
  }, [loadReports])

  return {
    data,
    isLoading,
    error,
    totalCount,
    initialLoadDone: initialLoadDone.current,
    refetch: loadReports
  }
}
