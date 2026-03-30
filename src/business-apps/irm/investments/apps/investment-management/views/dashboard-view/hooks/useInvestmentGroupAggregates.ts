import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface GroupTypeAggregate {
  value: string
  count: number
  totalAmount: number
  percentage: number
}

export interface TrendData {
  percentage: number
  trend: 'up' | 'down' | 'neutral'
}

export interface GroupAggregateData {
  totalCount: number
  totalAmount: number
  typeBreakdown: GroupTypeAggregate[]
  trendData: TrendData
}

export interface GroupTypeInfo {
  id: string
  value: string
}

// Converts a free-form catalog string into a valid GraphQL alias prefix
const toAlias = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_')

const buildQuery = (groupName: string, types: GroupTypeInfo[], currency: string, quarterAgoDate: string): string => {
  const g = toAlias(groupName)

  const typeAliases = types
    .map(
      type => `
    ${toAlias(type.value)}_amount: InvestmentAggregate(
      where: {
        isDeleted: { _eq: false }
        investmentType: { value: { _eq: "${type.value}" } }
        currency: { code: { _eq: "${currency}" } }
      }
    ) {
      aggregate { count sum { totalInvestmentAmount } }
    }`
    )
    .join('\n')

  return `
    query GetInvestmentGroupAggregates {
      ${g}_total: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { value: { _eq: "${groupName}" } }
          currency: { code: { _eq: "${currency}" } }
        }
      ) {
        aggregate { count sum { totalInvestmentAmount } }
      }

      ${g}_previous: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { value: { _eq: "${groupName}" } }
          currency: { code: { _eq: "${currency}" } }
          createdAt: { _lte: "${quarterAgoDate}" }
        }
      ) {
        aggregate { sum { totalInvestmentAmount } }
      }

      ${typeAliases}
    }
  `
}

const computeTrend = (currentAmount: number, previousAmount: number): TrendData => {
  if (previousAmount === 0) {
    return {
      percentage: currentAmount > 0 ? 100 : 0,
      trend: currentAmount > 0 ? 'up' : 'neutral'
    }
  }
  const change = ((currentAmount - previousAmount) / previousAmount) * 100
  if (Math.abs(change) < 0.1) return { percentage: 0, trend: 'neutral' }
  return {
    percentage: Math.min(Math.abs(change), 1000),
    trend: change > 0 ? 'up' : 'down'
  }
}

export const useInvestmentGroupAggregates = (
  accessToken: string,
  groupName: string,
  types: GroupTypeInfo[],
  currency: string
) => {
  const [data, setData] = useState<GroupAggregateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Stable key so useCallback only re-runs when type values actually change
  const typesKey = useMemo(() => types.map(t => t.value).join('|'), [types])

  const fetchAggregates = useCallback(async () => {
    if (!accessToken || !groupName || !currency) return

    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const quarterAgoDate = quarterAgo.toISOString().split('T')[0]

    const query = buildQuery(groupName, types, currency, quarterAgoDate)

    try {
      setIsLoading(true)
      setError(null)

      const result = await graphqlClient.request(query)

      const g = toAlias(groupName)
      const totalCount: number = result[`${g}_total`]?.aggregate?.count ?? 0
      const totalAmount: number = result[`${g}_total`]?.aggregate?.sum?.totalInvestmentAmount ?? 0
      const previousAmount: number = result[`${g}_previous`]?.aggregate?.sum?.totalInvestmentAmount ?? 0

      const typeBreakdown: GroupTypeAggregate[] = types
        .map(type => {
          const alias = `${toAlias(type.value)}_amount`
          const count: number = result[alias]?.aggregate?.count ?? 0
          const amount: number = result[alias]?.aggregate?.sum?.totalInvestmentAmount ?? 0
          return {
            value: type.value,
            count,
            totalAmount: amount,
            percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
          }
        })
        .filter(t => t.count > 0)

      setData({
        totalCount,
        totalAmount,
        typeBreakdown,
        trendData: computeTrend(totalAmount, previousAmount)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch investment group aggregates'
      setError(message)
      console.error('Error fetching investment group aggregates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, groupName, typesKey, currency, graphqlClient])

  useEffect(() => {
    fetchAggregates()
  }, [fetchAggregates])

  return { data, isLoading, error, refetch: fetchAggregates }
}
