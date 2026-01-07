// Liquid Fund Reports Hook - Uses common data layer
// Simple wrapper around useGetInvestmentReports with liquid fund specific logic

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports'
import type { InvestmentReportQueryVariables } from '@/common/data/investment-report/queries/investmentReportQueries'
import type { InvestmentReport } from '@/common/data/investment/types/investmentTypes'
import { AnalyticsRowData } from '../types/AnalyticsTypes'

export interface LiquidFundReportFilters {
  startDate?: string
  endDate?: string
  currencyIds?: string[]
  investmentType?: string // For client-side filtering by liquid fund type
  search?: string
  onCurrenciesChange?: (currencies: string[]) => void // Callback to report available currencies
}

export interface UseLiquidFundReportsReturn {
  reports: InvestmentReport[]
  analyticsData: AnalyticsRowData[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

/**
 * Hook for fetching liquid fund investment reports
 * Uses the common data layer and applies liquid fund specific transformations
 */
export const useLiquidFundReports = (
  context: BusinessAppContextProps,
  filters: LiquidFundReportFilters
): UseLiquidFundReportsReturn => {
  const [reports, setReports] = useState<InvestmentReport[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRowData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { fetchInvestmentReports } = useGetInvestmentReports(context)

  // Use ref to stabilize onCurrenciesChange callback and prevent infinite loops
  const onCurrenciesChangeRef = useRef(filters.onCurrenciesChange)
  useEffect(() => {
    onCurrenciesChangeRef.current = filters.onCurrenciesChange
  }, [filters.onCurrenciesChange])

  const loadReports = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build query variables - use the common data layer
      const variables: InvestmentReportQueryVariables = {
        investmentGroupIds: ['InvestmentGroup:v1:LIQUID_FUND'],
        limit: 1000,
        offset: 0,
        orderBy: [{ field: 'date', direction: 'DESC' }]
      }

      // Apply date filters
      if (filters.startDate) {
        variables.reportDateFrom = filters.startDate
      }
      if (filters.endDate) {
        variables.reportDateTo = filters.endDate
      }
      if (filters.currencyIds && filters.currencyIds.length > 0) {
        variables.currencyIds = filters.currencyIds
      }
      if (filters.search?.trim()) {
        variables.search = filters.search.trim()
      }

      // Fetch using common data layer
      const { reports: fetchedReports, total } = await fetchInvestmentReports(variables)

      // Get latest report per investment
      const latestReportsByInvestment = new Map<string, InvestmentReport>()

      fetchedReports.forEach(report => {
        const investmentId = report.investment?.id
        if (!investmentId || !report.date) return

        const existingReport = latestReportsByInvestment.get(investmentId)
        if (!existingReport?.date || new Date(report.date) > new Date(existingReport.date)) {
          latestReportsByInvestment.set(investmentId, report)
        }
      })

      const latestReports = Array.from(latestReportsByInvestment.values())

      // Transform to analytics data
      const transformedData: AnalyticsRowData[] = []

      latestReports.forEach(report => {
        const liquidFundReports = report.liquidFundInvestmentReport || []

        // Skip if no liquid fund reports (might be a different investment group)
        if (liquidFundReports.length === 0) {
          console.warn('[useLiquidFundReports] Report has no liquidFundInvestmentReport:', {
            reportId: report.id,
            investmentId: report.investment?.id,
            investmentName: report.investment?.name
          })
          return
        }

        // Create a row for each liquid fund report
        liquidFundReports.forEach(liquidFundReport => {
          // Extract currency code from catalog entry or ref
          const currencyCode = report.currency?.code || report.currencyRef?.split(':')?.pop() || 'EUR'

          // Extract financial data from additionalProperties or root level
          const additionalProps = liquidFundReport.additionalProperties || {}

          const row: AnalyticsRowData = {
            id: `${report.id}-${liquidFundReport.id}`,
            investmentId: report.investment?.id || '',
            investmentName: report.investment?.name || '',
            reportDate: report.date,
            reportId: report.id, // Store InvestmentReport ID for actions column

            // Required fields for AnalyticsRowData
            cashBankIdentifier:
              liquidFundReport.bankAccountNumber || liquidFundReport.liquidFundInvestment?.investment?.code || '',
            proprietorName: liquidFundReport.proprietorName || additionalProps.proprietor || '',
            originalCurrency: currencyCode,
            portfolioId: liquidFundReport.liquidFundInvestmentId || liquidFundReport.id || '',
            investmentType:
              liquidFundReport.investmentLiquidFundType?.code ||
              liquidFundReport.investmentLiquidFundTypeRef?.split(':')?.pop() ||
              'UNKNOWN',

            // Financial data from additionalProperties
            openingBalance: additionalProps.openingBalance || 0,
            incoming: additionalProps.incoming || 0,
            outgoing: additionalProps.outgoing || 0,
            realizedGainsLosses:
              (additionalProps.realizedGainsLossesCurrency || 0) + (additionalProps.realizedGainsLossesSharePrice || 0),
            unrealizedGainsLosses:
              (additionalProps.unrealizedGainsLossesCurrency || 0) +
              (additionalProps.unrealizedGainsLossesSharePrice || 0),
            closingBalance: additionalProps.closingBalance || report.investmentMarketValue || 0,
            timeWeightedPerformance: additionalProps.timeWeightedPerformance || 0,
            reportCount: 1,

            // Optional fields
            maturityDate: liquidFundReport.maturityDate,
            interestRate: liquidFundReport.interestRate,
            depositName: additionalProps.name || liquidFundReport.liquidFundInvestment?.investment?.name || '',
            isin: liquidFundReport.liquidFundInvestment?.investment?.isin || additionalProps.isin || '',
            stocksQuantity: additionalProps.quantity,

            // Keep full structures for dynamic column access
            liquidFundReport: liquidFundReport,
            liquidFundInvestment: liquidFundReport.liquidFundInvestment ? [liquidFundReport.liquidFundInvestment] : [],
            investment: report.investment
          }

          transformedData.push(row)
        })
      })

      // Debug logging
      console.log('[useLiquidFundReports] Transformation complete:', {
        totalReports: latestReports.length,
        transformedRows: transformedData.length,
        firstRow: transformedData[0],
        requestedFilter: filters.investmentType
      })

      // Client-side filtering by investment type (if needed)
      let filteredData = transformedData
      if (filters.investmentType) {
        const typeMapping: Record<string, string> = {
          'Bank Deposit': 'BANK_DEPOSITE', // Catalog has typo DEPOSITE (not DEPOSIT)
          'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT',
          'Money Market Funds': 'MONEY_MARKET_FUNDS',
          'Pension Fund': 'PENSION_FUNDS',
          Equity: 'EQUITY',
          Bond: 'BONDS'
        }

        // Handle comma-separated multiple types (for "Multiple Types" tab)
        const requestedTypes = filters.investmentType.split(',').map(t => t.trim())
        const targetTypes = requestedTypes.map(type => typeMapping[type]).filter(Boolean)

        console.log('[useLiquidFundReports] Filtering:', {
          requestedTypes,
          targetTypes,
          availableTypes: transformedData.map(item => ({
            id: item.id,
            investmentType: item.investmentType,
            liquidFundType: item.liquidFundReport?.investmentLiquidFundType?.code,
            liquidFundTypeRef: item.liquidFundReport?.investmentLiquidFundTypeRef
          }))
        })

        if (targetTypes.length > 0) {
          filteredData = transformedData.filter(item => {
            // Check multiple possible locations for the investment type code
            const itemTypeCode =
              item.investmentType || // From root level (set in transformation)
              item.liquidFundReport?.investmentLiquidFundType?.code ||
              item.liquidFundReport?.investmentLiquidFundTypeRef?.split(':')?.pop()

            // Check if item type matches any of the target types
            const matches = itemTypeCode && targetTypes.includes(itemTypeCode)

            if (!matches) {
              console.log('[useLiquidFundReports] Filtered out:', {
                investmentName: item.investmentName,
                itemTypeCode,
                targetTypes,
                liquidFundReport: item.liquidFundReport
              })
            }

            return matches
          })
        }

        console.log('[useLiquidFundReports] After filtering:', {
          beforeCount: transformedData.length,
          afterCount: filteredData.length
        })
      }

      setReports(latestReports)
      setAnalyticsData(filteredData)

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
      // (accounts for client-side deduping and filtering)
      const visibleCount = filters.investmentType ? filteredData.length : latestReports.length
      setTotalCount(visibleCount || total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load liquid fund reports'
      setError(new Error(errorMessage))
      console.error('Error loading liquid fund reports:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    context.userInfo,
    filters.startDate,
    filters.endDate,
    filters.currencyIds,
    filters.investmentType,
    filters.search,
    fetchInvestmentReports
    // Note: filters.onCurrenciesChange is intentionally excluded to prevent infinite loops
    // It's accessed via onCurrenciesChangeRef.current instead
  ])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  return {
    reports,
    analyticsData,
    isLoading,
    error,
    totalCount,
    refetch: loadReports
  }
}
