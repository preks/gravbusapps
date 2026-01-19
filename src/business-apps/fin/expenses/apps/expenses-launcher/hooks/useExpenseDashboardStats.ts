import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_LAUNCHER_STATS_BY_EMPLOYEE } from '../queries/launcherStats'

export interface ExpenseDashboardStats {
  // Header KPIs
  unassignedItems: number
  pendingRequests: number
  monthlyExpenses: number

  // Manager/Finance KPIs
  teamMonthlyExpenses: number
  pendingTeamPlans: number
  pendingTeamRequests: number

  // Finance-specific KPIs
  pendingFinanceRequests: number
  pendingFinanceAdvances: number

  // Card KPIs (existing)
  totalExpenseItems: number
  activePlans: number
  advancePayments: number
  totalSpent: number
  pendingApprovals: number
  upcomingEvents: number
}

export interface ExpenseDashboardStatsView {
  stats: ExpenseDashboardStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useExpenseDashboardStats = (context: BusinessAppContextProps): ExpenseDashboardStatsView => {
  const [stats, setStats] = useState<ExpenseDashboardStats>({
    // Header KPIs
    unassignedItems: 0,
    pendingRequests: 0,
    monthlyExpenses: 0,

    // Manager/Finance KPIs
    teamMonthlyExpenses: 0,
    pendingTeamPlans: 0,
    pendingTeamRequests: 0,

    // Finance-specific KPIs
    pendingFinanceRequests: 0,
    pendingFinanceAdvances: 0,

    // Card KPIs
    totalExpenseItems: 0,
    activePlans: 0,
    advancePayments: 0,
    totalSpent: 0,
    pendingApprovals: 0,
    upcomingEvents: 0
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStats = async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      setError('Employee ID not found. Cannot fetch dashboard statistics.')
      setIsLoading(false)
      return
    }

    if (!context.accessToken) {
      setError('Access token not found. Cannot fetch dashboard statistics.')
      setIsLoading(false)
      return
    }

    // Calculate current month start and end dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const currentMonthStartISO = currentMonthStart.toISOString()
    const currentMonthEndISO = currentMonthEnd.toISOString()

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<any>(GET_LAUNCHER_STATS_BY_EMPLOYEE, {
        employeeId,
        currentMonthStart: currentMonthStartISO,
        currentMonthEnd: currentMonthEndISO,
        currentMonthStartTz: currentMonthStartISO,
        currentMonthEndTz: currentMonthEndISO,
        now: now.toISOString(),
        currency: 'Currency:v1:EUR'
      })

      const newStats: ExpenseDashboardStats = {
        // Header KPIs
        unassignedItems: result?.unassignedItems?.aggregate?.count ?? 0,
        pendingRequests: result?.pendingRequests?.aggregate?.count ?? 0,
        monthlyExpenses: result?.monthlyExpenses?.aggregate?.sum?.totalAmount ?? 0,

        // Manager/Finance KPIs
        teamMonthlyExpenses: result?.teamMonthlyExpenses?.aggregate?.count ?? 0,
        pendingTeamPlans: result?.pendingTeamPlans?.aggregate?.sum?.deductibleAmount ?? 0,
        pendingTeamRequests: result?.pendingTeamRequests?.aggregate?.sum?.deductibleAmount ?? 0,

        // Finance-specific KPIs
        pendingFinanceRequests: result?.pendingFinanceRequests?.aggregate?.count ?? 0,
        pendingFinanceAdvances: result?.pendingFinanceAdvances?.aggregate?.count ?? 0,

        // Card KPIs
        totalExpenseItems: result?.totalExpenseItems?.aggregate?.count ?? 0,
        activePlans: result?.totalPlans?.aggregate?.count ?? 0,
        advancePayments: result?.totalAdvancePayments?.aggregate?.count ?? 0,
        totalSpent: result?.totalSpentYTD?.aggregate?.sum?.totalAmount ?? 0,
        pendingApprovals: result?.pendingApprovals?.aggregate?.count ?? 0,
        upcomingEvents:
          (result?.upcomingExpensePlans?.aggregate?.count ?? 0) +
          (result?.upcomingExpenseRequests?.aggregate?.count ?? 0)
      }

      setStats(newStats)
    } catch (err) {
      console.error('Error fetching launcher stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (context.accessToken && context.userInfo?.employeeDetails?.employeeId) {
      fetchStats()
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId])

  const refetch = () => {
    fetchStats()
  }

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}
