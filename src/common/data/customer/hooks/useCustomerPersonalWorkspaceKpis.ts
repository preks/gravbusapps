/**
 * Hook for fetching Personal Workspace KPIs
 * KPI aggregates are kept as hardcoded queries (no generic KPI builder pattern exists yet)
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CustomerPersonalWorkspaceKpisVariables {
  employeeId: string
}

export interface PersonalWorkspaceKpis {
  leads: {
    total: number
    current: number
    previous: number
    trend: number
    converted: number
  }
  opportunities: {
    total: number
    current: number
    previous: number
    trend: number
    won: number
  }
  contacts: {
    total: number
    current: number
    previous: number
    trend: number
  }
  accounts: {
    total: number
    currentQuarter: number
    previousQuarter: number
    trend: number
  }
  activities: {
    thisMonth: number
    lastMonth: number
    trend: number
  }
}

// KPI Query - Aggregate queries are specific and don't use generic builders
const GET_PERSONAL_WORKSPACE_KPIS = `
  query GetPersonalWorkspaceKpis(
    $employeeId: uuid!
    $currentMonthStart: timestamptz!
    $previousMonthStart: timestamptz!
    $previousMonthEnd: timestamptz!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Month Data
    currentLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentConvertedLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        leadStatus: { code: { _eq: "CONVERTED" } }
      }
    ) {
      aggregate { count }
    }
    
    currentContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentWonOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      aggregate { count }
    }
    
    currentActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    # Previous Month Data
    previousLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    # Total Counts
    totalLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    # Accounts Data (Quarterly Comparison)
    currentQuarterAccounts: AccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousQuarterAccounts: AccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalAccounts: AccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
  }
`

// Calculate trend percentage
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Hook to fetch KPIs for Personal Workspace
 */
export const useCustomerPersonalWorkspaceKpis = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchKpis = useCallback(
    async (variables: CustomerPersonalWorkspaceKpisVariables): Promise<PersonalWorkspaceKpis> => {
      const { employeeId } = variables

      // Calculate date ranges
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

      const currentQuarter = Math.floor(now.getMonth() / 3)
      const currentQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString()
      const previousQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).toISOString()
      const previousQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59).toISOString()

      try {
        const result = await graphqlClient.request<any>(GET_PERSONAL_WORKSPACE_KPIS, {
          employeeId,
          currentMonthStart,
          previousMonthStart,
          previousMonthEnd,
          currentQuarterStart,
          previousQuarterStart,
          previousQuarterEnd
        })

        // Map result to KPI structure
        const currentLeads = result.currentLeads?.aggregate?.count || 0
        const previousLeads = result.previousLeads?.aggregate?.count || 0
        const currentOpportunities = result.currentOpportunities?.aggregate?.count || 0
        const previousOpportunities = result.previousOpportunities?.aggregate?.count || 0
        const currentContacts = result.currentContacts?.aggregate?.count || 0
        const previousContacts = result.previousContacts?.aggregate?.count || 0
        const currentQuarterAccounts = result.currentQuarterAccounts?.aggregate?.count || 0
        const previousQuarterAccounts = result.previousQuarterAccounts?.aggregate?.count || 0
        const currentActivities = result.currentActivities?.aggregate?.count || 0
        const previousActivities = result.previousActivities?.aggregate?.count || 0

        const mappedKpis: PersonalWorkspaceKpis = {
          leads: {
            total: result.totalLeads?.aggregate?.count || 0,
            current: currentLeads,
            previous: previousLeads,
            trend: calculateTrend(currentLeads, previousLeads),
            converted: result.currentConvertedLeads?.aggregate?.count || 0
          },
          opportunities: {
            total: result.totalOpportunities?.aggregate?.count || 0,
            current: currentOpportunities,
            previous: previousOpportunities,
            trend: calculateTrend(currentOpportunities, previousOpportunities),
            won: result.currentWonOpportunities?.aggregate?.count || 0
          },
          contacts: {
            total: result.totalContacts?.aggregate?.count || 0,
            current: currentContacts,
            previous: previousContacts,
            trend: calculateTrend(currentContacts, previousContacts)
          },
          accounts: {
            total: result.totalAccounts?.aggregate?.count || 0,
            currentQuarter: currentQuarterAccounts,
            previousQuarter: previousQuarterAccounts,
            trend: calculateTrend(currentQuarterAccounts, previousQuarterAccounts)
          },
          activities: {
            thisMonth: currentActivities,
            lastMonth: previousActivities,
            trend: calculateTrend(currentActivities, previousActivities)
          }
        }

        return mappedKpis
      } catch (error) {
        console.error('Error fetching personal workspace KPIs:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchKpis }
}
