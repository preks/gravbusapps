import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

interface CountAggregateResult {
  aggregate: {
    count: number
  }
}

interface InvestmentCountResponse {
  InvestmentAggregate: CountAggregateResult
}

type InvestmentType = 'overview' | 'equity' | 'liquidFund' | 'realEstate'

/**
 * Hook to fetch aggregate count for a single investment type
 * Fetches on mount (after filters are ready) and refetches when filters or currency change
 * Uses standard descriptor-based filtering from common
 */
export const useInvestmentTypeCount = (
  context: BusinessAppContextProps,
  investmentType: InvestmentType,
  currencyFilter?: string,
  filters?: Record<string, any>,
  filtersReady: boolean = true
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [count, setCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCount = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const customConditions: Record<string, any>[] = []

      if (investmentType === 'equity') {
        customConditions.push({ equityInvestment: { id: { _isNull: false } } })
      } else if (investmentType === 'liquidFund') {
        customConditions.push({ liquidFundInvestment: { id: { _isNull: false } } })
      } else if (investmentType === 'realEstate') {
        customConditions.push({ realEstateInvestment: { id: { _isNull: false } } })
      }

      if (currencyFilter) {
        customConditions.push({ currency: { code: { _eq: currencyFilter } } })
      }

      const whereObj = buildWhere({
        variables: filters || {},
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions,
        isDeleted: true
      })

      const query = `
        query GetInvestmentTypeCount($where: InvestmentBoolExp) {
          InvestmentAggregate(where: $where) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<InvestmentCountResponse>(query, { where: whereObj })
      setCount(result.InvestmentAggregate.aggregate.count || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investment count'
      console.error(`[useInvestmentTypeCount][${investmentType}] Error:`, errorMessage, err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, investmentType, currencyFilter, filters])

  // Fetch count on mount and whenever filters or currency change
  // Wait for initial filters to be ready before fetching
  useEffect(() => {
    if (filtersReady) {
      void fetchCount()
    }
  }, [fetchCount, filtersReady])

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount
  }
}
