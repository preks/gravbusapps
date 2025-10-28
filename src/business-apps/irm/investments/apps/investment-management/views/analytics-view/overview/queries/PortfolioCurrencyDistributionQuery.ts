import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Cache for distinct currencies to avoid duplicate queries
 */
let currenciesCache: Array<{ currencyCode: string }> | null = null
let cacheTimestamp: number | null = null
let pendingRequest: Promise<Array<{ currencyCode: string }>> | null = null
const CACHE_DURATION = 5000 // 5 seconds

/**
 * GraphQL Query: Get distinct currencies
 */
const GET_DISTINCT_CURRENCIES = `
  query GetDistinctCurrencies {
    Investment(
      where: {
        isDeleted: { _eq: false }
        currencyRef: { _isNull: false }
      }
      distinctOn: [currencyRef]
    ) {
      currencyRef
      currency {
        code
      }
    }
  }
`

/**
 * Fetch distinct currencies with smart caching
 */
export const useGetDistinctCurrencies = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  return async (): Promise<Array<{ currencyCode: string }>> => {
    const now = Date.now()

    // Return cached data if still valid
    if (currenciesCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
      return currenciesCache
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
            currencyRef: string
            currency: { code: string } | null
          }>
        }>(GET_DISTINCT_CURRENCIES)

        const currencies = result.Investment.filter(inv => inv.currency?.code)
          .map(inv => ({
            currencyCode: inv.currency!.code
          }))
          .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode))

        // Update cache
        currenciesCache = currencies
        cacheTimestamp = Date.now()

        return currencies
      } finally {
        // Clear pending request
        pendingRequest = null
      }
    })()

    return pendingRequest
  }
}

/**
 * Build GraphQL query for currency count distribution using aliases
 */
const BUILD_CURRENCY_COUNT_DISTRIBUTION_QUERY = (currencies: Array<{ currencyCode: string }>): string => {
  const currencyAggregates = currencies
    .map(currency => {
      const sanitizedCode = currency.currencyCode.replaceAll(/\W/g, '_')

      return `
      currency_${sanitizedCode}: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          currency: { code: { _eq: "${currency.currencyCode}" } }
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetCurrencyCountDistribution {
      ${currencyAggregates}
    }
  `
}

/**
 * Build GraphQL query for currency amount distribution using aliases
 */
const BUILD_CURRENCY_AMOUNT_DISTRIBUTION_QUERY = (currencies: Array<{ currencyCode: string }>): string => {
  const currencyAggregates = currencies
    .map(currency => {
      const sanitizedCode = currency.currencyCode.replaceAll(/\W/g, '_')

      return `
      currency_${sanitizedCode}: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          currency: { code: { _eq: "${currency.currencyCode}" } }
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
    query GetCurrencyAmountDistribution {
      ${currencyAggregates}
    }
  `
}

/**
 * Build query function for currency count distribution
 */
export const buildCurrencyCountDistributionQuery = (
  currencies: Array<{ currencyCode: string }>,
  graphqlClient: any
) => {
  return async (): Promise<Array<{ currency: string; count: number }>> => {
    if (currencies.length === 0) {
      return []
    }

    const query = BUILD_CURRENCY_COUNT_DISTRIBUTION_QUERY(currencies)
    const result = await graphqlClient.request(query)

    // Transform results
    return currencies
      .map(currency => {
        const sanitizedCode = currency.currencyCode.replaceAll(/\W/g, '_')
        const key = `currency_${sanitizedCode}`
        const count = result[key]?.aggregate?.count || 0

        return {
          currency: currency.currencyCode,
          count
        }
      })
      .filter(item => item.count > 0)
  }
}

/**
 * Build query function for currency amount distribution
 */
export const buildCurrencyAmountDistributionQuery = (
  currencies: Array<{ currencyCode: string }>,
  graphqlClient: any
) => {
  return async (): Promise<Array<{ currency: string; totalAmount: number }>> => {
    if (currencies.length === 0) {
      return []
    }

    const query = BUILD_CURRENCY_AMOUNT_DISTRIBUTION_QUERY(currencies)
    const result = await graphqlClient.request(query)

    // Transform results
    return currencies
      .map(currency => {
        const sanitizedCode = currency.currencyCode.replaceAll(/\W/g, '_')
        const key = `currency_${sanitizedCode}`
        const totalAmount = result[key]?.aggregate?.sum?.totalInvestmentAmount || 0

        return {
          currency: currency.currencyCode,
          totalAmount
        }
      })
      .filter(item => item.totalAmount > 0)
  }
}

/**
 * Hook to fetch currency count distribution (uses shared distinct currencies cache)
 */
export const useGetCurrencyCountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const getDistinctCurrencies = useGetDistinctCurrencies(context)

  const fetchData = useCallback(async (): Promise<Array<{ currency: string; count: number }>> => {
    // First, fetch distinct currencies (uses shared cache)
    const currencies = await getDistinctCurrencies()

    // Then, fetch distribution data for those currencies
    const fetchFn = buildCurrencyCountDistributionQuery(currencies, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, getDistinctCurrencies])

  return { fetchData }
}

/**
 * Hook to fetch currency amount distribution (uses shared distinct currencies cache)
 */
export const useGetCurrencyAmountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const getDistinctCurrencies = useGetDistinctCurrencies(context)

  const fetchData = useCallback(async (): Promise<Array<{ currency: string; totalAmount: number }>> => {
    // First, fetch distinct currencies (uses shared cache)
    const currencies = await getDistinctCurrencies()

    // Then, fetch distribution data for those currencies
    const fetchFn = buildCurrencyAmountDistributionQuery(currencies, graphqlClient)
    return await fetchFn()
  }, [graphqlClient, getDistinctCurrencies])

  return { fetchData }
}
