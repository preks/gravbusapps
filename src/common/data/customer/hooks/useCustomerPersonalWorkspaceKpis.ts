import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_MY_KPIS } from '../queries/customerPersonalWorkspaceQueries'
import type { PersonalKpis } from '../types/customerPersonalWorkspaceTypes'
import dayjs from 'dayjs'

interface UseCustomerPersonalWorkspaceKpisParams {
  employeeId: string
  accessToken: string
}

interface UseCustomerPersonalWorkspaceKpisReturn {
  kpis: PersonalKpis | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching customer personal workspace KPIs
 * Returns performance metrics including leads, opportunities, accounts, activities, and contacts
 */
export const useCustomerPersonalWorkspaceKpis = ({
  employeeId,
  accessToken
}: UseCustomerPersonalWorkspaceKpisParams): UseCustomerPersonalWorkspaceKpisReturn => {
  const [kpis, setKpis] = useState<PersonalKpis | null>(null)
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
      const currentMonthStart = dayjs().startOf('month').toISOString()
      const previousMonthStart = dayjs().subtract(1, 'month').startOf('month').toISOString()
      const previousMonthEnd = dayjs().subtract(1, 'month').endOf('month').toISOString()

      // Add quarterly dates
      const currentQuarterStart = dayjs().startOf('quarter').toISOString()
      const previousQuarterStart = dayjs().subtract(1, 'quarter').startOf('quarter').toISOString()
      const previousQuarterEnd = dayjs().subtract(1, 'quarter').endOf('quarter').toISOString()

      const result = await graphqlClient.request<{
        currentLeads: { aggregate: { count: number } }
        currentConvertedLeads: { aggregate: { count: number } }
        currentContacts: { aggregate: { count: number } }
        currentOpportunities: { aggregate: { count: number } }
        currentWonOpportunities: { aggregate: { count: number } }
        currentActivities: { aggregate: { count: number } }
        previousLeads: { aggregate: { count: number } }
        previousContacts: { aggregate: { count: number } }
        previousOpportunities: { aggregate: { count: number } }
        previousActivities: { aggregate: { count: number } }
        totalLeads: { aggregate: { count: number } }
        totalContacts: { aggregate: { count: number } }
        totalOpportunities: { aggregate: { count: number } }
        currentQuarterAccounts: { aggregate: { count: number } }
        previousQuarterAccounts: { aggregate: { count: number } }
        totalAccounts: { aggregate: { count: number } }
      }>(GET_MY_KPIS, {
        employeeId,
        currentMonthStart,
        previousMonthStart,
        previousMonthEnd,
        currentQuarterStart,
        previousQuarterStart,
        previousQuarterEnd
      })

      // Calculate trends
      const currentLeadsCount = result.currentLeads?.aggregate?.count || 0
      const previousLeadsCount = result.previousLeads?.aggregate?.count || 0
      const leadsTrend = calculateTrend(currentLeadsCount, previousLeadsCount)

      const currentContactsCount = result.currentContacts?.aggregate?.count || 0
      const previousContactsCount = result.previousContacts?.aggregate?.count || 0
      const contactsTrend = calculateTrend(currentContactsCount, previousContactsCount)

      const currentOpportunitiesCount = result.currentOpportunities?.aggregate?.count || 0
      const previousOpportunitiesCount = result.previousOpportunities?.aggregate?.count || 0
      const opportunitiesTrend = calculateTrend(currentOpportunitiesCount, previousOpportunitiesCount)

      const currentActivitiesCount = result.currentActivities?.aggregate?.count || 0
      const previousActivitiesCount = result.previousActivities?.aggregate?.count || 0
      const activitiesTrend = calculateTrend(currentActivitiesCount, previousActivitiesCount)

      // Calculate quarterly accounts trend
      const currentQuarterAccountsCount = result.currentQuarterAccounts?.aggregate?.count || 0
      const previousQuarterAccountsCount = result.previousQuarterAccounts?.aggregate?.count || 0
      const accountsTrend = calculateTrend(currentQuarterAccountsCount, previousQuarterAccountsCount)

      setKpis({
        leads: {
          total: result.totalLeads?.aggregate?.count || 0,
          converted: result.currentConvertedLeads?.aggregate?.count || 0,
          trend: leadsTrend
        },
        opportunities: {
          total: result.totalOpportunities?.aggregate?.count || 0,
          won: result.currentWonOpportunities?.aggregate?.count || 0,
          trend: opportunitiesTrend
        },
        accounts: {
          total: result.totalAccounts?.aggregate?.count || 0,
          trend: accountsTrend
        },
        activities: {
          thisMonth: currentActivitiesCount,
          trend: activitiesTrend
        },
        contacts: {
          total: result.totalContacts?.aggregate?.count || 0,
          trend: contactsTrend
        }
      })
    } catch (err) {
      console.error('Error fetching customer personal workspace KPIs:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken])

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
