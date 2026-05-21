import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

/**
 * Cache for distinct investment statuses to avoid duplicate queries
 */
let statusesCache: Array<{ statusRef: string; statusValue: string }> | null = null
let cacheTimestamp: number | null = null
let pendingRequest: Promise<Array<{ statusRef: string; statusValue: string }>> | null = null
const CACHE_DURATION = 5000 // 5 seconds

/**
 * GraphQL Query: Get distinct investment statuses
 */
const GET_DISTINCT_STATUSES = `
  query GetDistinctInvestmentStatuses {
    Investment(
      where: {
        isDeleted: { _eq: false }
        investmentStatusRef: { _isNull: false }
      }
      distinctOn: [investmentStatusRef]
    ) {
      investmentStatusRef
      investmentStatus {
        value
      }
    }
  }
`

/**
 * Fetch distinct investment statuses with smart caching
 */
export const useGetDistinctStatuses = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  return async (): Promise<Array<{ statusRef: string; statusValue: string }>> => {
    const now = Date.now()

    // Return cached data if still valid
    if (statusesCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
      return statusesCache
    }

    // Return existing pending request if one is in flight
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    pendingRequest = (async () => {
      try {
        const result = await graphqlClient.request<{
          Investment: Array<{
            investmentStatusRef: string
            investmentStatus: { value: string } | null
          }>
        }>(GET_DISTINCT_STATUSES)

        const statuses = result.Investment.filter(inv => inv.investmentStatus?.value)
          .map(inv => ({
            statusRef: inv.investmentStatusRef,
            statusValue: inv.investmentStatus!.value
          }))
          .sort((a, b) => a.statusValue.localeCompare(b.statusValue))

        // Update cache
        statusesCache = statuses
        cacheTimestamp = Date.now()

        return statuses
      } finally {
        // Clear pending request
        pendingRequest = null
      }
    })()

    return pendingRequest
  }
}

/**
 * Build GraphQL query for status count distribution using aliases
 */
const BUILD_STATUS_COUNT_DISTRIBUTION_QUERY = (
  statuses: Array<{ statusRef: string; statusValue: string }>,
  currency: string
): string => {
  const statusAggregates = statuses
    .map(status => {
      const sanitizedRef = status.statusRef.replaceAll(/\W/g, '_')
      const currencyCondition = isAllCurrencySelection(currency) ? '' : `currency: { code: { _eq: "${currency}" } }`

      return `
      status_${sanitizedRef}: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentStatusRef: { _eq: "${status.statusRef}" }
          ${currencyCondition}
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetStatusCountDistribution {
      ${statusAggregates}
    }
  `
}

/**
 * Build GraphQL query for status amount distribution using aliases
 */
const BUILD_STATUS_AMOUNT_DISTRIBUTION_QUERY = (
  statuses: Array<{ statusRef: string; statusValue: string }>,
  currency: string
): string => {
  const statusAggregates = statuses
    .map(status => {
      const sanitizedRef = status.statusRef.replaceAll(/\W/g, '_')

      return `
      status_${sanitizedRef}: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentStatusRef: { _eq: "${status.statusRef}" }
          ${isAllCurrencySelection(currency) ? '' : `currency: { code: { _eq: "${currency}" } }`}
        }
      ) {
        aggregate {
          sum {
            totalInvestmentAmount
          }
        }
      }`
    })
    .join('\n')

  return `
    query GetStatusAmountDistribution {
      ${statusAggregates}
    }
  `
}

/**
 * Build query function for status count distribution
 */
export const buildStatusCountDistributionQuery = (
  statuses: Array<{ statusRef: string; statusValue: string }>,
  currency: string,
  graphqlClient: any
) => {
  return async (): Promise<Array<{ status: string; count: number }>> => {
    if (statuses.length === 0) {
      return []
    }

    const query = BUILD_STATUS_COUNT_DISTRIBUTION_QUERY(statuses, currency)
    const result = await graphqlClient.request(query)

    // Transform results
    const distribution = statuses
      .map(status => {
        const sanitizedRef = status.statusRef.replaceAll(/\W/g, '_')
        const key = `status_${sanitizedRef}`
        const count = result[key]?.aggregate?.count || 0

        return {
          status: status.statusValue,
          count
        }
      })
      .filter(item => item.count > 0)

    return distribution
  }
}

/**
 * Build query function for status amount distribution
 */
export const buildStatusAmountDistributionQuery = (
  statuses: Array<{ statusRef: string; statusValue: string }>,
  currency: string,
  graphqlClient: any
) => {
  return async (): Promise<Array<{ status: string; totalAmount: number }>> => {
    if (statuses.length === 0) {
      return []
    }

    const query = BUILD_STATUS_AMOUNT_DISTRIBUTION_QUERY(statuses, currency)
    const result = await graphqlClient.request(query)

    // Transform results
    const distribution = statuses
      .map(status => {
        const sanitizedRef = status.statusRef.replaceAll(/\W/g, '_')
        const key = `status_${sanitizedRef}`
        const totalAmount = result[key]?.aggregate?.sum?.totalInvestmentAmount || 0

        return {
          status: status.statusValue,
          totalAmount
        }
      })
      .filter(item => item.totalAmount > 0)

    return distribution
  }
}

/**
 * Hook to fetch status count distribution (uses shared distinct statuses cache)
 */
export const useGetStatusCountDistribution = (context: BusinessAppContextProps, currency: string = 'All') => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const getDistinctStatuses = useGetDistinctStatuses(context)

  const fetchData = useCallback(async (): Promise<Array<{ status: string; count: number }>> => {
    // First, fetch distinct statuses (uses shared cache)
    const statuses = await getDistinctStatuses()

    // Then, fetch distribution data for those statuses
    const fetchFn = buildStatusCountDistributionQuery(statuses, currency, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, currency, getDistinctStatuses])

  return { fetchData }
}

/**
 * Hook to fetch status amount distribution (uses shared distinct statuses cache)
 */
export const useGetStatusAmountDistribution = (context: BusinessAppContextProps, currency: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const getDistinctStatuses = useGetDistinctStatuses(context)

  const fetchData = useCallback(async (): Promise<Array<{ status: string; totalAmount: number }>> => {
    // First, fetch distinct statuses (uses shared cache)
    const statuses = await getDistinctStatuses()

    // Then, fetch distribution data for those statuses
    const fetchFn = buildStatusAmountDistributionQuery(statuses, currency, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, currency, getDistinctStatuses])

  return { fetchData }
}
