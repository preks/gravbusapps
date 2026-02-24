import { useCallback, useEffect, useState, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentGroup } from './useInvestmentGroups'

export interface AllInvestmentCounts {
  overview: { count: number; isLoading: boolean }
  groups: Record<string, { count: number; isLoading: boolean }>
}

/**
 * Fetches counts for overview + all investment groups in a single GraphQL query
 * using aliased InvestmentAggregate calls.
 */
export const useAllInvestmentCounts = (
  context: BusinessAppContextProps,
  investmentGroups: InvestmentGroup[],
  currencyByTab: Record<string, string>,
  filtersByTab: Record<string, Record<string, any>>,
  filtersReady: boolean
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const stableKey = useMemo(
    () => JSON.stringify({ groups: investmentGroups.map(g => g.code), currencyByTab, filtersByTab }),
    [investmentGroups, currencyByTab, filtersByTab]
  )

  const fetchAllCounts = useCallback(async () => {
    if (!context.accessToken || investmentGroups.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const overviewCurrency = currencyByTab.overview || 'EUR'
      const overviewFilters = filtersByTab.overview || {}
      const overviewCurrencyConditions: Record<string, any>[] = overviewCurrency
        ? [{ currency: { code: { _eq: overviewCurrency } } }]
        : []

      const overviewWhere = buildWhere({
        variables: overviewFilters,
        descriptors: INVESTMENT_DESCRIPTORS,
        customConditions: overviewCurrencyConditions,
        isDeleted: true
      })

      const groupWheres: Record<string, any> = {}
      for (const group of investmentGroups) {
        const tabCurrency = currencyByTab[group.tabId] || 'EUR'
        const tabFilters = filtersByTab[group.tabId] || {}
        const conditions: Record<string, any>[] = [
          { investmentGroup: { id: { _eq: `InvestmentGroup:v1:${group.code}` } } }
        ]
        if (tabCurrency) {
          conditions.push({ currency: { code: { _eq: tabCurrency } } })
        }

        groupWheres[group.tabId] = buildWhere({
          variables: tabFilters,
          descriptors: INVESTMENT_DESCRIPTORS,
          customConditions: conditions,
          isDeleted: true
        })
      }

      const variableDeclarations = [
        '$overviewWhere: InvestmentBoolExp',
        ...investmentGroups.map((_, i) => `$group${i}Where: InvestmentBoolExp`)
      ].join(', ')

      const aggregateFields = [
        `overview: InvestmentAggregate(where: $overviewWhere) { aggregate { count } }`,
        ...investmentGroups.map(
          (_, i) => `group${i}: InvestmentAggregate(where: $group${i}Where) { aggregate { count } }`
        )
      ].join('\n    ')

      const query = `
        query GetAllInvestmentCounts(${variableDeclarations}) {
          ${aggregateFields}
        }
      `

      const variables: Record<string, any> = { overviewWhere: overviewWhere }
      investmentGroups.forEach((g, i) => {
        variables[`group${i}Where`] = groupWheres[g.tabId]
      })

      const result = await graphqlClient.request<Record<string, any>>(query, variables)

      const newCounts: Record<string, number> = {
        overview: result.overview?.aggregate?.count || 0
      }
      investmentGroups.forEach((g, i) => {
        newCounts[g.tabId] = result[`group${i}`]?.aggregate?.count || 0
      })

      setCounts(newCounts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investment counts'
      console.error('[useAllInvestmentCounts] Error:', errorMessage, err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, stableKey])

  useEffect(() => {
    if (filtersReady && investmentGroups.length > 0) {
      void fetchAllCounts()
    }
  }, [fetchAllCounts, filtersReady, investmentGroups.length])

  const result = useMemo(
    (): AllInvestmentCounts => ({
      overview: { count: counts.overview || 0, isLoading },
      groups: investmentGroups.reduce(
        (acc, g) => {
          acc[g.tabId] = { count: counts[g.tabId] || 0, isLoading }
          return acc
        },
        {} as Record<string, { count: number; isLoading: boolean }>
      )
    }),
    [counts, isLoading, investmentGroups]
  )

  return { ...result, error, refetch: fetchAllCounts }
}
