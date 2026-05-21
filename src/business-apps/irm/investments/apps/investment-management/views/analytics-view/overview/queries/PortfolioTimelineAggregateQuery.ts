import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

/**
 * Timeline aggregate data structure for portfolio overview
 */
export interface PortfolioTimelineYearData {
  year: string
  investmentGroup: string
  totalAmount: number
  count: number
}

export interface PortfolioTimelineAggregateResult {
  yearlyData: PortfolioTimelineYearData[]
}

/**
 * Get the last N years including current year
 */
const getLastNYears = (n: number): string[] => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    years.push((currentYear - i).toString())
  }
  return years
}

/**
 * Build optimized aggregate query for portfolio timeline data
 * Groups by investment group (Equity, Liquid Fund, Real Estate, etc.)
 */
const BUILD_PORTFOLIO_TIMELINE_QUERY = (years: string[], investmentGroups: string[], currency?: string): string => {
  // Build where conditions for each year+group combination
  const buildConditions = (year: string, investmentGroupRef: string) => {
    const conditions = [
      '{ isDeleted: { _eq: false } }',
      isAllCurrencySelection(currency) ? '' : `{ currency: { code: { _eq: "${currency}" } } }`,
      `{ acquisitionDate: { _gte: "${year}-01-01", _lt: "${Number.parseInt(year) + 1}-01-01" } }`,
      `{ investmentGroupRef: { _eq: "${investmentGroupRef}" } }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return `_and: [
          ${conditions}
        ]`
  }

  // Create alias name that's GraphQL-safe
  const createAlias = (year: string, investmentGroupRef: string) => {
    return `year_${year}_group_${investmentGroupRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
  }

  // Generate aggregate queries for each year+group combination
  const aggregates = years
    .flatMap(year =>
      investmentGroups.map(investmentGroupRef => {
        const alias = createAlias(year, investmentGroupRef)
        return `
      ${alias}: InvestmentAggregate(
        where: {
          ${buildConditions(year, investmentGroupRef)}
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
          }
        }
      }`
      })
    )
    .join('\n')

  return `
    query GetPortfolioTimelineAggregates {
      ${aggregates}
    }
  `
}

/**
 * Fetch distinct investment groups
 */
const GET_DISTINCT_INVESTMENT_GROUPS_QUERY = `
  query GetDistinctInvestmentGroups {
    Investment(
      distinctOn: investmentGroupRef
      orderBy: [{ investmentGroupRef: ASC }]
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { investmentGroupRef: { _isNull: false } }
        ]
      }
    ) {
      investmentGroupRef
      investmentGroup {
        value
      }
    }
  }
`

interface InvestmentGroupInfo {
  investmentGroupRef: string
  investmentGroupValue: string
}

/**
 * Smart cache for distinct investment groups
 * Prevents duplicate queries when multiple hooks request the same data
 */
let investmentGroupsCache: InvestmentGroupInfo[] | null = null
let cacheTimestamp: number | null = null
let pendingRequest: Promise<InvestmentGroupInfo[]> | null = null

const CACHE_DURATION = 60000 // 1 minute cache

/**
 * Hook to fetch distinct investment groups with smart caching
 */
export const useGetDistinctInvestmentGroups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchDistinctInvestmentGroups = useCallback(async (): Promise<InvestmentGroupInfo[]> => {
    // Check if cache is still valid
    if (investmentGroupsCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return investmentGroupsCache
    }

    // If there's already a pending request, return it (promise deduplication)
    if (pendingRequest) {
      return pendingRequest
    }

    // Create and store the pending request
    pendingRequest = (async () => {
      try {
        const result = await graphqlClient.request<{
          Investment: Array<{
            investmentGroupRef: string
            investmentGroup: { value: string } | null
          }>
        }>(GET_DISTINCT_INVESTMENT_GROUPS_QUERY)

        const groups: InvestmentGroupInfo[] = result.Investment.filter(
          inv => inv.investmentGroup?.value && inv.investmentGroupRef
        )
          .map(inv => ({
            investmentGroupRef: inv.investmentGroupRef,
            investmentGroupValue: inv.investmentGroup!.value
          }))
          .sort((a, b) => a.investmentGroupValue.localeCompare(b.investmentGroupValue))

        // Update cache
        investmentGroupsCache = groups
        cacheTimestamp = Date.now()

        return groups
      } finally {
        // Clear pending request
        pendingRequest = null
      }
    })()

    return pendingRequest
  }, [graphqlClient])

  return { fetchDistinctInvestmentGroups }
}

/**
 * Smart cache for timeline aggregate results
 * Caches results per currency to avoid duplicate queries
 */
interface TimelineAggregateCache {
  [key: string]: {
    data: PortfolioTimelineAggregateResult
    timestamp: number
  }
}

const timelineAggregateCache: TimelineAggregateCache = {}
const pendingAggregateRequests: { [key: string]: Promise<PortfolioTimelineAggregateResult> } = {}

const AGGREGATE_CACHE_DURATION = 60000 // 1 minute cache

/**
 * Hook to fetch portfolio timeline aggregate data with optimized GraphQL query
 * Uses smart caching for:
 * 1. Distinct investment groups (shared across all requests)
 * 2. Aggregate results per currency (to avoid duplicate queries when both charts use same currency)
 */
export const useGetPortfolioTimelineAggregate = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctInvestmentGroups } = useGetDistinctInvestmentGroups(context)

  const fetchTimelineAggregate = useCallback(
    async (yearsCount: number = 5, currency?: string): Promise<PortfolioTimelineAggregateResult> => {
      // Create cache key based on parameters
      const cacheKey = `${yearsCount}_${currency || 'ALL'}`

      // Check if cached data is still valid
      const cached = timelineAggregateCache[cacheKey]
      if (cached && Date.now() - cached.timestamp < AGGREGATE_CACHE_DURATION) {
        return cached.data
      }

      // If there's already a pending request for this key, return it (promise deduplication)
      // This handles concurrent requests for the same currency
      if (pendingAggregateRequests[cacheKey] !== undefined) {
        return pendingAggregateRequests[cacheKey]
      }

      // Create and store the pending request
      pendingAggregateRequests[cacheKey] = (async () => {
        try {
          // Step 1: Fetch distinct investment groups (with smart caching)
          const investmentGroups = await fetchDistinctInvestmentGroups()

          if (investmentGroups.length === 0) {
            return { yearlyData: [] }
          }

          // Step 2: Get last N years
          const years = getLastNYears(yearsCount)

          // Step 3: Build and execute aggregate query
          const investmentGroupRefs = investmentGroups.map(g => g.investmentGroupRef)
          const query = BUILD_PORTFOLIO_TIMELINE_QUERY(years, investmentGroupRefs, currency)

          const result =
            await graphqlClient.request<
              Record<string, { aggregate: { count: number; sum: { totalInvestmentAmount: number } } }>
            >(query)

          // Step 4: Transform result into structured data
          const yearlyData: PortfolioTimelineYearData[] = []

          const aliasPattern = /year_(\d+)_group_(.+)/
          for (const [key, value] of Object.entries(result)) {
            // Parse alias: year_2021_group_InvestmentGroup_v1_EQUITY
            const match = aliasPattern.exec(key)
            if (!match) {
              continue
            }

            const year = match[1]
            const groupRefEncoded = match[2]

            // Find the matching group info by encoded reference
            const groupInfo = investmentGroups.find(
              g => g.investmentGroupRef.replaceAll(/\W/g, '_') === groupRefEncoded
            )

            if (!groupInfo) {
              continue
            }

            if (value.aggregate) {
              const dataPoint = {
                year,
                investmentGroup: groupInfo.investmentGroupValue,
                totalAmount: value.aggregate.sum?.totalInvestmentAmount || 0,
                count: value.aggregate.count || 0
              }
              yearlyData.push(dataPoint)
            }
          }

          const resultData = { yearlyData }

          // Update cache
          timelineAggregateCache[cacheKey] = {
            data: resultData,
            timestamp: Date.now()
          }

          return resultData
        } finally {
          // Clear pending request
          delete pendingAggregateRequests[cacheKey]
        }
      })()

      return pendingAggregateRequests[cacheKey]
    },
    [graphqlClient, fetchDistinctInvestmentGroups]
  )

  return { fetchTimelineAggregate }
}
