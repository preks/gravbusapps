import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface GroupTypeAggregate {
  value: string
  count: number
  percentage: number
}

export interface TrendData {
  percentage: number
  trend: 'up' | 'down' | 'neutral'
}

export interface GroupAggregateData {
  totalCount: number
  typeBreakdown: GroupTypeAggregate[]
  trendData: TrendData
}

export interface GroupTypeInfo {
  id: string
  value: string
}

// Converts a free-form catalog string into a valid GraphQL alias prefix
const toAlias = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_')

const buildQuery = (groupName: string, types: GroupTypeInfo[], quarterAgoDate: string): string => {
  const g = toAlias(groupName)

  const typeAliases = types
    .map(
      type => `
    ${toAlias(type.value)}_count: InvestmentAggregate(
      where: {
        isDeleted: { _eq: false }
        investmentGroup: { value: { _eq: "${groupName}" } }
        investmentType: { value: { _eq: "${type.value}" } }
      }
    ) {
      aggregate { count }
    }`
    )
    .join('\n')

  return `
    query GetInvestmentGroupAggregates {
      ${g}_total: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { value: { _eq: "${groupName}" } }
        }
      ) {
        aggregate { count }
      }

      ${g}_previous: InvestmentAggregate(
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { value: { _eq: "${groupName}" } }
          createdAt: { _lte: "${quarterAgoDate}" }
        }
      ) {
        aggregate { count }
      }

      ${typeAliases}
    }
  `
}

const computeTrend = (currentCount: number, previousCount: number): TrendData => {
  if (previousCount === 0) {
    return {
      percentage: currentCount > 0 ? 100 : 0,
      trend: currentCount > 0 ? 'up' : 'neutral'
    }
  }
  const change = ((currentCount - previousCount) / previousCount) * 100
  if (Math.abs(change) < 0.1) return { percentage: 0, trend: 'neutral' }
  return {
    percentage: Math.min(Math.abs(change), 1000),
    trend: change > 0 ? 'up' : 'down'
  }
}

export const useInvestmentGroupAggregates = (accessToken: string, groupName: string, types: GroupTypeInfo[]) => {
  const [data, setData] = useState<GroupAggregateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Stable key so useCallback only re-runs when type values actually change
  const typesKey = useMemo(() => types.map(t => t.value).join('|'), [types])

  const fetchAggregates = useCallback(async () => {
    if (!accessToken || !groupName) return

    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const quarterAgoDate = quarterAgo.toISOString().split('T')[0]

    const query = buildQuery(groupName, types, quarterAgoDate)

    try {
      setIsLoading(true)
      setError(null)

      const result = await graphqlClient.request(query)

      const g = toAlias(groupName)
      const totalCount: number = result[`${g}_total`]?.aggregate?.count ?? 0
      const previousCount: number = result[`${g}_previous`]?.aggregate?.count ?? 0

      const typeBreakdown: GroupTypeAggregate[] = types
        .map(type => {
          const alias = `${toAlias(type.value)}_count`
          const count: number = result[alias]?.aggregate?.count ?? 0
          return {
            value: type.value,
            count,
            percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
          }
        })
        .filter(t => t.count > 0)

      setData({
        totalCount,
        typeBreakdown,
        trendData: computeTrend(totalCount, previousCount)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch investment group aggregates'
      setError(message)
      console.error('Error fetching investment group aggregates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, groupName, typesKey, graphqlClient])

  useEffect(() => {
    fetchAggregates()
  }, [fetchAggregates])

  return { data, isLoading, error, refetch: fetchAggregates }
}
