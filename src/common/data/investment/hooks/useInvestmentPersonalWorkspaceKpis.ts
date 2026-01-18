/**
 * Hook for fetching Personal Workspace KPIs
 * KPI aggregates are kept as hardcoded queries (no generic KPI builder pattern exists yet)
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentPersonalWorkspaceKpisVariables {
  employeeId: string
}

export interface PersonalWorkspaceKpis {
  opportunities: {
    total: number
    currentQuarter: number
    previousQuarter: number
    trend: number
  }
  accounts: {
    total: number
    currentQuarter: number
    previousQuarter: number
    trend: number
  }
  contacts: {
    total: number
    currentQuarter: number
    previousQuarter: number
    trend: number
  }
  investments: {
    total: number
    currentQuarter: number
    previousQuarter: number
    trend: number
  }
}

// KPI Query - Aggregate queries are specific and don't use generic builders
const GET_PERSONAL_WORKSPACE_KPIS = `
  query GetPersonalWorkspaceKpis(
    $employeeId: uuid!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Quarter Data
    currentQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    currentQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    # Previous Quarter Data
    previousQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    previousQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    # Total Counts
    totalOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate { count }
    }
    
    totalInvestments: InvestmentAggregate(
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
export const useInvestmentPersonalWorkspaceKpis = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchKpis = useCallback(
    async (variables: InvestmentPersonalWorkspaceKpisVariables): Promise<PersonalWorkspaceKpis> => {
      const { employeeId } = variables

      // Calculate date ranges (IRM uses quarterly comparisons)
      const now = new Date()
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const currentQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString()
      const previousQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).toISOString()
      const previousQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59).toISOString()

      try {
        const result = await graphqlClient.request<any>(GET_PERSONAL_WORKSPACE_KPIS, {
          employeeId,
          currentQuarterStart,
          previousQuarterStart,
          previousQuarterEnd
        })

        // Map result to KPI structure
        const currentOpportunities = result.currentQuarterOpportunities?.aggregate?.count || 0
        const previousOpportunities = result.previousQuarterOpportunities?.aggregate?.count || 0
        const currentAccounts = result.currentQuarterAccounts?.aggregate?.count || 0
        const previousAccounts = result.previousQuarterAccounts?.aggregate?.count || 0
        const currentContacts = result.currentQuarterContacts?.aggregate?.count || 0
        const previousContacts = result.previousQuarterContacts?.aggregate?.count || 0
        const currentInvestments = result.currentQuarterInvestments?.aggregate?.count || 0
        const previousInvestments = result.previousQuarterInvestments?.aggregate?.count || 0

        const mappedKpis: PersonalWorkspaceKpis = {
          opportunities: {
            total: result.totalOpportunities?.aggregate?.count || 0,
            currentQuarter: currentOpportunities,
            previousQuarter: previousOpportunities,
            trend: calculateTrend(currentOpportunities, previousOpportunities)
          },
          accounts: {
            total: result.totalAccounts?.aggregate?.count || 0,
            currentQuarter: currentAccounts,
            previousQuarter: previousAccounts,
            trend: calculateTrend(currentAccounts, previousAccounts)
          },
          contacts: {
            total: result.totalContacts?.aggregate?.count || 0,
            currentQuarter: currentContacts,
            previousQuarter: previousContacts,
            trend: calculateTrend(currentContacts, previousContacts)
          },
          investments: {
            total: result.totalInvestments?.aggregate?.count || 0,
            currentQuarter: currentInvestments,
            previousQuarter: previousInvestments,
            trend: calculateTrend(currentInvestments, previousInvestments)
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
