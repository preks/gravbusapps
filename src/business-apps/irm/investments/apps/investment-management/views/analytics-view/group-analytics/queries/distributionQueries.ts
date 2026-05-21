import { useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentGroupWhere,
  getCategoryCondition,
  getDistinctQuery,
  parseAggregate,
  toDistinctCategories,
  type AggregateResult,
  type DistributionDimension,
  type InvestmentGroupDistributionDatum
} from './shared'

const AGGREGATE_FIELDS = `
  aggregate {
    count
    sum { totalInvestmentAmount }
    avg { totalInvestmentAmount }
  }
`

export const useInvestmentGroupDistributionQueries = (accessToken: string | undefined) => {
  const graphqlClient = useGraphQLClient(accessToken)

  // Distinct categories (types/statuses/currencies) don't change with currency filters —
  // cache them per (groupId, dimension) so they are only fetched once per group session.
  const categoryCacheRef = useRef<Map<string, Promise<ReturnType<typeof toDistinctCategories>>>>(new Map())

  // In-flight dedup: concurrent calls with the same (groupId, dimension, currency) share one Promise.
  const pendingRef = useRef<Map<string, Promise<InvestmentGroupDistributionDatum[]>>>(new Map())

  const fetchCategories = useCallback(
    (groupId: string, dimension: DistributionDimension) => {
      const key = `${groupId}:${dimension}`
      const cached = categoryCacheRef.current.get(key)
      if (cached) return cached

      const promise = (async () => {
        const distinctWhere = buildInvestmentGroupWhere(groupId)
        const distinctResult = await graphqlClient.request<{ Investment: any[] }>(getDistinctQuery(dimension), {
          where: distinctWhere
        })
        return toDistinctCategories(dimension, distinctResult.Investment || [])
      })()

      categoryCacheRef.current.set(key, promise)
      return promise
    },
    [graphqlClient]
  )

  const fetchDistribution = useCallback(
    async (groupId: string, dimension: DistributionDimension, currencyCode?: string) => {
      if (!accessToken) return []

      const key = `${groupId}:${dimension}:${currencyCode ?? ''}`
      const existing = pendingRef.current.get(key)
      if (existing) return existing

      const promise = (async () => {
        const categories = await fetchCategories(groupId, dimension)

        if (categories.length === 0) return []

        const variableDefinitions = categories.map((_, i) => `$where${i}: InvestmentBoolExp`).join(', ')
        const aggregateFields = categories
          .map((_, i) => `cat${i}: InvestmentAggregate(where: $where${i}) { ${AGGREGATE_FIELDS} }`)
          .join('\n')
        const variables = Object.fromEntries(
          categories.map((category, i) => [
            `where${i}`,
            buildInvestmentGroupWhere(groupId, dimension === 'currency' ? undefined : currencyCode, [
              getCategoryCondition(dimension, category.id)
            ])
          ])
        )

        const result = await graphqlClient.request<Record<string, AggregateResult['InvestmentAggregate']>>(
          `query GetInvestmentGroupDistribution(${variableDefinitions}) { ${aggregateFields} }`,
          variables
        )

        return categories
          .map((category, i) => ({
            category: category.label,
            ...parseAggregate({ InvestmentAggregate: result[`cat${i}`] })
          }))
          .filter(item => item.count > 0 || item.totalAmount > 0)
      })()

      pendingRef.current.set(key, promise)
      void promise.finally(() => pendingRef.current.delete(key))

      return promise
    },
    [accessToken, fetchCategories, graphqlClient]
  )

  return {
    fetchDistribution
  }
}
