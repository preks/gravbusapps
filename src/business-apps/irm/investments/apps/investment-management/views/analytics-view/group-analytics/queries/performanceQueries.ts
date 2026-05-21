import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentGroupWhere,
  normalizeAmount,
  type AggregateResult,
  type InvestmentGroupParetoDatum,
  type TopInvestmentDatum
} from './shared'

export const useInvestmentGroupPerformanceQueries = (accessToken: string | undefined) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTopInvestments = useCallback(
    async (groupId: string, currencyCode?: string, limit = 10): Promise<TopInvestmentDatum[]> => {
      if (!accessToken) return []

      const where = buildInvestmentGroupWhere(groupId, currencyCode)
      const result = await graphqlClient.request<{ Investment: any[] }>(
        `
          query GetTopInvestments($where: InvestmentBoolExp, $limit: Int) {
            Investment(where: $where, limit: $limit, orderBy: [{ totalInvestmentAmount: DESC_NULLS_LAST }]) {
              id
              name
              totalInvestmentAmount
              currency { code }
            }
          }
        `,
        { where, limit }
      )

      return (result.Investment || []).map(investment => ({
        id: investment.id,
        name: investment.name || 'Unknown investment',
        totalAmount: normalizeAmount(investment.totalInvestmentAmount),
        currencyCode: investment.currency?.code || currencyCode || 'EUR'
      }))
    },
    [accessToken, graphqlClient]
  )

  const fetchInvestmentPareto = useCallback(
    async (groupId: string, currencyCode?: string, limit = 10): Promise<InvestmentGroupParetoDatum[]> => {
      if (!accessToken) return []

      const where = buildInvestmentGroupWhere(groupId, currencyCode)
      const result = await graphqlClient.request<{
        InvestmentAggregate?: AggregateResult['InvestmentAggregate']
        Investment: any[]
      }>(
        `
          query GetInvestmentGroupPareto($where: InvestmentBoolExp, $limit: Int) {
            InvestmentAggregate(where: $where) {
              aggregate {
                sum { totalInvestmentAmount }
              }
            }
            Investment(where: $where, limit: $limit, orderBy: [{ totalInvestmentAmount: DESC_NULLS_LAST }]) {
              id
              name
              totalInvestmentAmount
              currency { code }
            }
          }
        `,
        { where, limit }
      )

      const groupTotalAmount = normalizeAmount(result.InvestmentAggregate?.aggregate?.sum?.totalInvestmentAmount)
      let cumulativeAmount = 0

      return (result.Investment || [])
        .map(investment => {
          const totalAmount = normalizeAmount(investment.totalInvestmentAmount)
          cumulativeAmount += totalAmount

          return {
            id: investment.id,
            name: investment.name || 'Unknown investment',
            totalAmount,
            cumulativeAmount,
            cumulativePercentage: groupTotalAmount > 0 ? (cumulativeAmount / groupTotalAmount) * 100 : 0,
            currencyCode: investment.currency?.code || currencyCode || 'EUR'
          }
        })
        .filter(investment => investment.totalAmount > 0)
    },
    [accessToken, graphqlClient]
  )

  return {
    fetchInvestmentPareto,
    fetchTopInvestments
  }
}
