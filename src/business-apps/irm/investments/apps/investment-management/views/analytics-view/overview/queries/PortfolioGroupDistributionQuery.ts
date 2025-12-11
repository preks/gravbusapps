import { useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface GroupDistributionData {
  group: string
  count: number
  totalAmount: number
}

/**
 * Shared query for getting distinct investment groups
 */
const GET_DISTINCT_GROUPS = (): string => {
  return `
    query GetDistinctInvestmentGroups {
      Investment(
        where: {
          isDeleted: { _eq: false }
        }
        distinctOn: [investmentGroupRef]
      ) {
        investmentGroup {
          id
          value
        }
      }
    }
  `
}

// In-memory cache for distinct groups (shared across all hook instances)
let groupsCache: string[] | null = null
let cacheTimestamp: number = 0
let pendingRequest: Promise<string[]> | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

/**
 * Shared hook for fetching distinct groups with intelligent caching
 * When multiple hooks call this simultaneously (e.g., count and amount hooks),
 * only one network request is made and the result is shared
 */
export const useGetDistinctGroups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isMountedRef = useRef(true)

  const fetchDistinctGroups = useCallback(async (): Promise<string[]> => {
    // Check if we have a valid cache
    const now = Date.now()
    if (groupsCache && now - cacheTimestamp < CACHE_DURATION) {
      return groupsCache
    }

    // If there's already a pending request, wait for it instead of creating a new one
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    try {
      const query = GET_DISTINCT_GROUPS()

      // Store the promise so other concurrent calls can wait for it
      pendingRequest = graphqlClient.request(query).then((result: any) => {
        if (!isMountedRef.current) {
          throw new Error('Component unmounted')
        }

        if (!result.Investment || !Array.isArray(result.Investment)) {
          groupsCache = []
          cacheTimestamp = Date.now()
          pendingRequest = null
          return []
        }

        const groups = result.Investment.filter((inv: any) => inv.investmentGroup?.value).map(
          (inv: any) => inv.investmentGroup.value
        )

        // Update cache
        groupsCache = groups
        cacheTimestamp = Date.now()
        pendingRequest = null

        return groups
      })

      return await pendingRequest
    } finally {
      pendingRequest = null
    }
  }, [graphqlClient])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return { fetchDistinctGroups }
}

/**
 * Build aggregate query for Group Count Distribution
 */
const BUILD_GROUP_COUNT_DISTRIBUTION_QUERY = (groups: string[], currency: string): string => {
  const groupAliases = groups
    .map(group => {
      const alias = group.replaceAll(/[^a-zA-Z0-9]/g, '_')
      const currencyCondition = currency === 'All' ? '' : `{ currency: { code: { _eq: "${currency}" } } }`

      return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { value: { _eq: "${group}" } } }
            ${currencyCondition || ''}
          ]
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetGroupCountDistribution {
      ${groupAliases}
    }
  `
}

/**
 * Build aggregate query for Group Amount Distribution
 */
const BUILD_GROUP_AMOUNT_DISTRIBUTION_QUERY = (groups: string[], currency: string): string => {
  const groupAliases = groups
    .map(group => {
      const alias = group.replaceAll(/[^a-zA-Z0-9]/g, '_')

      return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { value: { _eq: "${group}" } } }
            { currency: { code: { _eq: "${currency}" } } }
          ]
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
    .join('\n')

  return `
    query GetGroupAmountDistribution {
      ${groupAliases}
    }
  `
}

/**
 * Parse group distribution response
 */
const parseGroupDistributionResponse = (
  data: any,
  groups: string[],
  includeAmount: boolean = false
): GroupDistributionData[] => {
  return groups
    .map(group => {
      const alias = group.replaceAll(/[^a-zA-Z0-9]/g, '_')
      const aggregate = data[alias]?.aggregate

      return {
        group,
        count: aggregate?.count || 0,
        totalAmount: includeAmount ? aggregate?.sum?.totalInvestmentAmount || 0 : 0
      }
    })
    .filter(item => item.count > 0) // Only include groups with data
}

/**
 * Build query function for group count distribution
 */
export const buildGroupCountDistributionQuery = (groups: string[], currency: string, graphqlClient: any) => {
  return async (): Promise<GroupDistributionData[]> => {
    if (groups.length === 0) {
      return []
    }

    const query = BUILD_GROUP_COUNT_DISTRIBUTION_QUERY(groups, currency)
    const result = await graphqlClient.request(query)
    return parseGroupDistributionResponse(result, groups, false)
  }
}

/**
 * Build query function for group amount distribution
 */
export const buildGroupAmountDistributionQuery = (groups: string[], currency: string, graphqlClient: any) => {
  return async (): Promise<GroupDistributionData[]> => {
    if (groups.length === 0) {
      return []
    }

    const query = BUILD_GROUP_AMOUNT_DISTRIBUTION_QUERY(groups, currency)
    const result = await graphqlClient.request(query)
    return parseGroupDistributionResponse(result, groups, true)
  }
}

/**
 * Hook to fetch group count distribution (uses shared distinct groups cache)
 */
export const useGetGroupCountDistribution = (context: BusinessAppContextProps, currency: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctGroups } = useGetDistinctGroups(context)

  const fetchData = useCallback(async (): Promise<GroupDistributionData[]> => {
    // First, fetch distinct groups (uses shared cache)
    const groups = await fetchDistinctGroups()

    // Then, fetch distribution data for those groups
    const fetchFn = buildGroupCountDistributionQuery(groups, currency, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, currency, fetchDistinctGroups])

  return { fetchData }
}

/**
 * Hook to fetch group amount distribution (uses shared distinct groups cache)
 */
export const useGetGroupAmountDistribution = (context: BusinessAppContextProps, currency: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctGroups } = useGetDistinctGroups(context)

  const fetchData = useCallback(async (): Promise<GroupDistributionData[]> => {
    // First, fetch distinct groups (uses shared cache)
    const groups = await fetchDistinctGroups()

    // Then, fetch distribution data for those groups
    const fetchFn = buildGroupAmountDistributionQuery(groups, currency, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, currency, fetchDistinctGroups])

  return { fetchData }
}
