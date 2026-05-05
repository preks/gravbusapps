// Shared investment-report data hook.
// Catalog-driven data fetching for every investment group (current and future)
// rendered by `GenericReportTab`. Uses GraphQL variables — never string
// interpolation — so the (group, sub-section) scope and per-descriptor filters
// are composed cleanly via `buildInvestmentReportWhereClause`.

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
import {
  investmentGroup as INVESTMENT_GROUP_CATALOG,
  investmentType as INVESTMENT_TYPE_CATALOG,
  investmentLiquidFundType as INVESTMENT_LIQUID_FUND_TYPE_CATALOG
} from '@/common/data/investment/constants/investmentCatalogs'
import type { ReportSectionKind } from '../../utils/subSectionHelpers'

export interface UseInvestmentReportDataConfig {
  // Investment group code - any string (dynamically determined from catalog)
  investmentGroup: string
  filters: Record<string, any>
  investmentType?: string
  sectionKind?: ReportSectionKind
  accessToken: string
  userInfo?: any
  onCurrenciesChange?: (currencies: string[]) => void
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
  /** Fetches all matching reports (no pagination) for CSV/Excel export. */
  fetchAll: () => Promise<InvestmentReport[]>
  // Pagination
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
}

/**
 * Single source of truth for the static (group + optional sub-section) scope
 * applied to every investment-report query.
 *
 * Returned as object-form GraphQL `where` fragments so callers can splice them
 * into `customConditions` (data queries) or serialize them for
 * `useFilterGroups`'s `baseWhereParts` (filter dropdowns).
 *
 * Sub-section path is driven by resolved section kind:
 * - `'liquidFundType'`: `liquidFundInvestmentReport.investmentLiquidFundType.id`
 *   (Liquid Fund — each sub-section maps 1:1 to an `InvestmentLiquidFundType`
 *   catalog entry).
 * - `'investmentType'`: `investment.investmentType.id`.
 * - `'group'`: only the investment group condition is emitted.
 *
 * The synthetic values `'all'` and a section equal to the group code itself
 * (used by `'none'` strategies) intentionally emit only the group condition.
 */
const buildScopeConditions = (
  investmentGroup: string,
  currentSection?: string,
  sectionKind: ReportSectionKind = 'investmentType'
): Record<string, any>[] => {
  const conditions: Record<string, any>[] = [
    {
      investment: {
        investmentGroup: { id: { _eq: `${INVESTMENT_GROUP_CATALOG}:${investmentGroup}` } }
      }
    }
  ]

  if (currentSection && currentSection !== investmentGroup && currentSection !== 'all' && sectionKind !== 'group') {
    if (sectionKind === 'liquidFundType') {
      conditions.push({
        liquidFundInvestmentReport: {
          investmentLiquidFundType: { id: { _eq: `${INVESTMENT_LIQUID_FUND_TYPE_CATALOG}:${currentSection}` } }
        }
      })
    } else {
      conditions.push({
        investment: {
          investmentType: { id: { _eq: `${INVESTMENT_TYPE_CATALOG}:${currentSection}` } }
        }
      })
    }
  }

  return conditions
}

/**
 * Serialize a plain `where` object into the GraphQL fragment syntax used by
 * `useFilterGroups`'s `baseWhereParts`. Inputs are limited to the small
 * `{ key: { _eq: "..." } }` shapes produced by `buildScopeConditions`, so a
 * minimal recursive serializer is sufficient.
 */
const serializeWhereObject = (obj: Record<string, any>): string => {
  const parts = Object.entries(obj).map(([key, value]) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return `${key}: ${serializeWhereObject(value)}`
    }
    if (typeof value === 'string') {
      return `${key}: "${value}"`
    }
    return `${key}: ${String(value)}`
  })
  return `{ ${parts.join(', ')} }`
}

/**
 * Build the static GraphQL where parts that scope a report query to its
 * (group, sub-section). Returned as string fragments suitable for
 * `useFilterGroups`'s `baseWhereParts`.
 *
 * Mirrors the static portion of `buildInvestmentReportWhereClause` (via the
 * shared `buildScopeConditions`), so filter dropdowns only surface options
 * that can actually appear in the underlying table.
 *
 * Conditions are wrapped in a single `_and: [...]` fragment so they never
 * collide with auto-injected nested-array constraints inside
 * `buildCombinedFilterGroupsQuery` (which would otherwise produce duplicate
 * top-level keys like `liquidFundInvestmentReport`, violating GraphQL's input
 * object field uniqueness rule).
 */
export const buildInvestmentReportBaseWhereParts = (
  investmentGroup: string,
  currentSection?: string,
  sectionKind?: ReportSectionKind
): string[] => {
  const conditions = buildScopeConditions(investmentGroup, currentSection, sectionKind).map(serializeWhereObject)
  return [`_and: [${conditions.join(', ')}]`]
}

/** Builds the GraphQL where clause for investment report queries. */
export const buildInvestmentReportWhereClause = (
  investmentGroup: string,
  filters: Record<string, any>,
  sectionKind?: ReportSectionKind
): Record<string, any> => {
  const activeSection =
    filters.investmentType && filters.investmentType !== 'all' && filters.investmentType !== investmentGroup
      ? (filters.investmentType as string)
      : undefined

  const customConditions = buildScopeConditions(investmentGroup, activeSection, sectionKind)

  return buildWhere({
    variables: filters,
    descriptors: INVESTMENT_REPORT_DESCRIPTORS,
    isDeleted: true,
    customConditions
  })
}

/**
 * Catalog-driven hook for fetching investment-report data for any investment
 * group. Composes the (group, sub-section) scope via `buildScopeConditions`
 * and applies descriptor-driven filters via `buildWhere`.
 */
export const useInvestmentReportData = (config: UseInvestmentReportDataConfig): UseInvestmentReportDataReturn => {
  const {
    investmentGroup,
    filters,
    investmentType,
    sectionKind,
    accessToken,
    onCurrenciesChange,
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

      // Build where using the shared helper
      const whereObj = buildInvestmentReportWhereClause(investmentGroup, filters, sectionKind)

      // Map column IDs to sortable field paths
      // Some columns need mapping (e.g., 'investment' -> 'investment.name')
      const getSortFieldPath = (columnId: string): string => {
        // Find the descriptor for this field to get the proper sortPath
        const descriptor = INVESTMENT_REPORT_DESCRIPTORS.find(d => d.key === columnId)

        // If descriptor has a sortPath, use it
        if (descriptor?.sortPath) {
          return descriptor.sortPath
        }

        // For dynamic catalog fields with underscores, convert to dot notation
        // and map catalog paths to report paths.
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

      setData(fetchedReports)

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
    sectionKind,
    filterKey,
    page,
    pageSize,
    sortField,
    sortOrder
  ])

  // Fetch all reports without pagination — used by the export hook
  const fetchAll = useCallback(async (): Promise<InvestmentReport[]> => {
    if (!accessToken) return []

    const fragment = buildInvestmentReportFragment(INVESTMENT_REPORT_QUERY_CONFIGS.record)
    const whereObj = buildInvestmentReportWhereClause(investmentGroup, filters, sectionKind)

    const query = `
      query GetAllInvestmentReportsForExport(
        $where: InvestmentReportBoolExp
        $orderBy: [InvestmentReportOrderBy!]
        $limit: Int
      ) {
        InvestmentReport(
          where: $where
          orderBy: $orderBy
          limit: $limit
        ) {
          ${fragment}
        }
      }
    `

    const result = await graphqlClient.request<{ InvestmentReport: InvestmentReport[] }>(query, {
      where: whereObj,
      orderBy: [{ date: 'DESC_NULLS_LAST' }],
      limit: totalCount
    })

    return result.InvestmentReport || []
  }, [accessToken, graphqlClient, investmentGroup, sectionKind, filterKey, totalCount])

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
    fetchAll,
    page,
    pageSize,
    totalPages,
    setPage: setInternalPage,
    setPageSize: setInternalPageSize
  }
}
