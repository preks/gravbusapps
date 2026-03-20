// Shared Investment Report Data Hook
// Consolidates data fetching logic for Equity, Real Estate, and Liquid Fund tables
// Uses NEW pattern with proper GraphQL variables (no string template queries)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import {
  buildInvestmentReportFragment,
  INVESTMENT_REPORT_QUERY_CONFIGS
} from '@/common/data/investment/queries/investmentReportQueries.new'
import {
  INVESTMENT_REPORT_DESCRIPTORS,
  type InvestmentReport
} from '@/common/data/investment/types/investmentReportTypes'
import { getReportGroupConfiguration } from '../../config/reportGroupConfigurations'

export interface UseInvestmentReportDataConfig {
  // Investment group code - any string (dynamically determined from catalog)
  investmentGroup: string
  filters: Record<string, any>
  investmentType?: string
  accessToken: string
  userInfo?: any
  onCurrenciesChange?: (currencies: string[]) => void
  // Optional: transform reports to different format (for Liquid Funds)
  dataTransformer?: (reports: any[]) => any[]
  // Optional: enable/disable data fetching
  enabled?: boolean
  // Optional: pagination params
  page?: number
  pageSize?: number
  // Optional: sorting params
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface UseInvestmentReportDataReturn {
  data: any[] // reports or transformed analytics data
  isLoading: boolean
  error: Error | null
  totalCount: number
  initialLoadDone: boolean
  refetch: () => Promise<void>
  // Pagination
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
}

/**
 * Get investment type filter strategy based on configuration
 * This allows different groups to filter investmentType differently
 */
const getInvestmentTypeFilterStrategy = (
  config: ReturnType<typeof getReportGroupConfiguration>,
  investmentType: string
): Record<string, any>[] => {
  // If group has section-to-type mapping (Liquid Fund), use special strategy
  if (config.sectionToTypeMapping) {
    const mappedType = config.sectionToTypeMapping[investmentType] || investmentType

    // Handle "Multiple Types" special case
    if (mappedType === 'MONEY_MARKET_FUNDS') {
      return [
        {
          _and: [
            {
              liquidFundInvestmentReport: {
                investmentLiquidFundType: {
                  id: {
                    _isNull: false
                  }
                }
              }
            },
            {
              liquidFundInvestmentReport: {
                investmentLiquidFundType: {
                  id: {
                    _nin: [
                      'InvestmentLiquidFundType:v1:BANK_DEPOSITE',
                      'InvestmentLiquidFundType:v1:FIXED_TERM_DEPOSIT'
                    ]
                  }
                }
              }
            }
          ]
        }
      ]
    }

    // Normal liquid fund type filter
    return [
      {
        liquidFundInvestmentReport: {
          investmentLiquidFundType: { id: { _eq: `InvestmentLiquidFundType:v1:${mappedType}` } }
        }
      }
    ]
  }

  // Default strategy: filter by investment.investmentType (for EQUITY, REAL_ESTATE, and unknown groups)
  return [
    {
      investment: {
        investmentType: { id: { _eq: `InvestmentType:v1:${investmentType}` } }
      }
    }
  ]
}

/**
 * Shared hook for fetching investment report data across all investment groups
 * Uses NEW pattern with proper GraphQL variables instead of string templates
 */
export const useInvestmentReportData = (config: UseInvestmentReportDataConfig): UseInvestmentReportDataReturn => {
  const {
    investmentGroup,
    filters,
    investmentType,
    accessToken,
    onCurrenciesChange,
    dataTransformer,
    enabled = true,
    page: externalPage,
    pageSize: externalPageSize,
    sortField,
    sortOrder = 'DESC'
  } = config

  // State management
  const [data, setData] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initialLoadDone = useRef(false)

  // Pagination state - use internal state if external not provided
  const [internalPage, setInternalPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(20)

  const page = externalPage ?? internalPage
  const pageSize = externalPageSize ?? internalPageSize
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  // Use refs to stabilize callback props and prevent infinite loops
  const onCurrenciesChangeRef = useRef(onCurrenciesChange)

  useEffect(() => {
    onCurrenciesChangeRef.current = onCurrenciesChange
  }, [onCurrenciesChange])

  // Track initial load completion
  useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [isLoading])

  // Use GraphQL client directly
  const graphqlClient = useGraphQLClient(accessToken)

  // Create stable filter key to prevent infinite loops
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  // Fetch data function
  const loadReports = useCallback(async () => {
    // Don't fetch if not enabled or no access token
    if (!enabled || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build fragment for investment reports
      const fragment = buildInvestmentReportFragment(INVESTMENT_REPORT_QUERY_CONFIGS.record)

      // Build where condition using descriptors and custom conditions
      const customConditions: Record<string, any>[] = []

      // Add investment group filter
      customConditions.push({
        investment: {
          investmentGroup: { id: { _eq: `InvestmentGroup:v1:${investmentGroup}` } }
        }
      })

      // Get investment type filter strategy from configuration
      const config = getReportGroupConfiguration(investmentGroup)

      // Only add investment type filter if it's different from the group code
      // When investmentType === investmentGroup, it means we're using 'none' strategy (no types)
      // In that case, we already filtered by investmentGroup above, no need to filter by type
      if (filters.investmentType && filters.investmentType !== 'all' && filters.investmentType !== investmentGroup) {
        const typeFilterStrategy = getInvestmentTypeFilterStrategy(config, filters.investmentType)
        customConditions.push(...typeFilterStrategy)
      }

      // Build where using descriptors (handles date, currency, search, etc.)
      const whereObj = buildWhere({
        variables: filters,
        descriptors: INVESTMENT_REPORT_DESCRIPTORS,
        isDeleted: true,
        customConditions
      })

      // Map column IDs to sortable field paths
      // Some columns need mapping (e.g., 'investment' -> 'investment.name')
      const getSortFieldPath = (columnId: string): string => {
        // Find the descriptor for this field to get the proper sortPath
        const descriptor = INVESTMENT_REPORT_DESCRIPTORS.find(d => d.key === columnId)

        // If descriptor has a sortPath, use it
        if (descriptor?.sortPath) {
          return descriptor.sortPath
        }

        // For dynamic catalog fields with underscores (e.g., equityInvestment_marketValue)
        // Convert to dot notation and map catalog paths to report paths
        if (columnId.includes('_')) {
          const dotNotation = columnId.split('_').join('.')

          // SPECIAL MAPPING: Catalog uses investment.* prefix for InvestmentReport root fields
          // Remove the investment. prefix to get the actual field name
          let mappedNotation = dotNotation
          if (dotNotation.startsWith('investment.')) {
            // Remove investment. prefix - these are InvestmentReport root fields
            mappedNotation = dotNotation.replace('investment.', '')
          } else {
            // CRITICAL MAPPING: Catalog uses *Investment paths, but GraphQL uses *InvestmentReport paths
            mappedNotation = dotNotation
              .replace('equityInvestment.', 'equityInvestmentReport.')
              .replace('liquidFundInvestment.', 'liquidFundInvestmentReport.')
              .replace('realEstateInvestment.', 'realEstateInvestmentReport.')
          }

          const dynamicDescriptor = INVESTMENT_REPORT_DESCRIPTORS.find(
            d => d.sortPath === mappedNotation || d.path === mappedNotation || d.key === mappedNotation
          )
          if (dynamicDescriptor?.sortPath) {
            return dynamicDescriptor.sortPath
          }
          // If no descriptor found, use mapped notation
          return mappedNotation
        }

        // Fallback: use columnId as-is
        return columnId
      }

      // Build orderBy - use sortField if provided, otherwise default to date DESC
      const sortFieldPath = sortField ? getSortFieldPath(sortField) : 'date'

      // Build orderBy directly as GraphQL object (bypass buildOrderBy since we already have the path)
      const orderByArray = sortFieldPath
        ? [buildNestedOrderBy(sortFieldPath, sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST')]
        : []

      // Helper to build nested orderBy object from dot-notation path
      function buildNestedOrderBy(dotPath: string, direction: string): any {
        const segments = dotPath.split('.').filter(Boolean)
        if (segments.length === 0) return {}

        const orderByObj: any = {}
        let current = orderByObj
        for (let i = 0; i < segments.length - 1; i++) {
          current[segments[i]] = {}
          current = current[segments[i]]
        }
        current[segments[segments.length - 1]] = direction
        return orderByObj
      }

      // Build query with proper variables
      const query = `
        query GetInvestmentReports(
          $where: InvestmentReportBoolExp
          $orderBy: [InvestmentReportOrderBy!]
          $limit: Int
          $offset: Int
        ) {
          InvestmentReport(
            where: $where
            orderBy: $orderBy
            limit: $limit
            offset: $offset
          ) {
            ${fragment}
          }
          InvestmentReportAggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `

      // Execute query with variables (not string interpolation!)
      const result = await graphqlClient.request<{
        InvestmentReport: InvestmentReport[]
        InvestmentReportAggregate: {
          aggregate: {
            count: number
          }
        }
      }>(query, {
        where: whereObj,
        orderBy: orderByArray,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })

      const fetchedReports = result.InvestmentReport || []
      const total = result.InvestmentReportAggregate?.aggregate?.count || 0

      // Apply optional data transformer (for Liquid Funds)
      const finalData = dataTransformer ? dataTransformer(fetchedReports) : fetchedReports
      setData(finalData)

      // Extract unique currency IDs from reports and notify parent
      if (onCurrenciesChangeRef.current) {
        const currencyIds = Array.from(
          new Set(
            fetchedReports
              .map(
                report =>
                  report.currencyRef || // InvestmentReport.currencyRef (primary)
                  report.investment?.currencyRef // Investment.currencyRef (fallback)
              )
              .filter((id): id is string => Boolean(id))
          )
        )
        onCurrenciesChangeRef.current(currencyIds)
      }

      setTotalCount(total)
      setError(null)
    } catch (err) {
      console.error('Error loading reports:', err)
      setError(err instanceof Error ? err : new Error('Failed to load reports'))
      setData([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    graphqlClient,
    enabled,
    investmentGroup,
    investmentType,
    filterKey,
    page,
    pageSize,
    sortField,
    sortOrder,
    dataTransformer
  ])

  // Reset to page 1 when filters, investment type, or page size changes
  useEffect(() => {
    if (externalPage === undefined) {
      setInternalPage(1)
    }
  }, [filterKey, investmentType, pageSize, externalPage])

  // Fetch reports on mount and when dependencies change
  useEffect(() => {
    loadReports()
  }, [loadReports])

  return {
    data,
    isLoading,
    error,
    totalCount,
    initialLoadDone: initialLoadDone.current,
    refetch: loadReports,
    page,
    pageSize,
    totalPages,
    setPage: setInternalPage,
    setPageSize: setInternalPageSize
  }
}
