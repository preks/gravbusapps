import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_MY_INVESTMENT_KPIS } from '../queries/MyInvestmentKpisQueries'
import type { InvestmentKpis } from '../types'
import dayjs from 'dayjs'

interface UseMyInvestmentKpisParams {
  employeeId: string
  accessToken: string
}

interface UseMyInvestmentKpisReturn {
  kpis: InvestmentKpis | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useMyInvestmentKpis = ({
  employeeId,
  accessToken
}: UseMyInvestmentKpisParams): UseMyInvestmentKpisReturn => {
  const [kpis, setKpis] = useState<InvestmentKpis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const fetchKpis = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const currentQuarterStart = dayjs().startOf('quarter').toISOString()
      const previousQuarterStart = dayjs().subtract(1, 'quarter').startOf('quarter').toISOString()
      const previousQuarterEnd = dayjs().subtract(1, 'quarter').endOf('quarter').toISOString()

      const result = await graphqlClient.request<{
        currentQuarterOpportunities: { aggregate: { count: number } }
        currentQuarterAccounts: { aggregate: { count: number } }
        currentQuarterContacts: { aggregate: { count: number } }
        currentQuarterInvestments: { aggregate: { count: number } }
        previousQuarterOpportunities: { aggregate: { count: number } }
        previousQuarterAccounts: { aggregate: { count: number } }
        previousQuarterContacts: { aggregate: { count: number } }
        previousQuarterInvestments: { aggregate: { count: number } }
        totalOpportunities: { aggregate: { count: number } }
        totalAccounts: { aggregate: { count: number } }
        totalContacts: { aggregate: { count: number } }
        totalInvestments: { aggregate: { count: number } }
      }>(GET_MY_INVESTMENT_KPIS, {
        employeeId,
        currentQuarterStart,
        previousQuarterStart,
        previousQuarterEnd
      })

      // Calculate quarterly trends
      const currentQuarterOpportunitiesCount = result.currentQuarterOpportunities?.aggregate?.count || 0
      const previousQuarterOpportunitiesCount = result.previousQuarterOpportunities?.aggregate?.count || 0
      const opportunitiesTrend = calculateTrend(currentQuarterOpportunitiesCount, previousQuarterOpportunitiesCount)

      const currentQuarterAccountsCount = result.currentQuarterAccounts?.aggregate?.count || 0
      const previousQuarterAccountsCount = result.previousQuarterAccounts?.aggregate?.count || 0
      const accountsTrend = calculateTrend(currentQuarterAccountsCount, previousQuarterAccountsCount)

      const currentQuarterContactsCount = result.currentQuarterContacts?.aggregate?.count || 0
      const previousQuarterContactsCount = result.previousQuarterContacts?.aggregate?.count || 0
      const contactsTrend = calculateTrend(currentQuarterContactsCount, previousQuarterContactsCount)

      const currentQuarterInvestmentsCount = result.currentQuarterInvestments?.aggregate?.count || 0
      const previousQuarterInvestmentsCount = result.previousQuarterInvestments?.aggregate?.count || 0
      const investmentsTrend = calculateTrend(currentQuarterInvestmentsCount, previousQuarterInvestmentsCount)

      setKpis({
        opportunities: {
          total: result.totalOpportunities?.aggregate?.count || 0,
          trend: opportunitiesTrend
        },
        accounts: {
          total: result.totalAccounts?.aggregate?.count || 0,
          trend: accountsTrend
        },
        contacts: {
          total: result.totalContacts?.aggregate?.count || 0,
          trend: contactsTrend
        },
        investments: {
          total: result.totalInvestments?.aggregate?.count || 0,
          trend: investmentsTrend
        }
      })
    } catch (err) {
      console.error('Error fetching investment KPIs:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch investment KPIs'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, graphqlClient])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  return {
    kpis,
    loading,
    error,
    refetch: () => {
      void fetchKpis()
    }
  }
}
