import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CrmDashboardQueryVariables {
  // No variables needed for dashboard stats, but keeping interface for consistency
}

export const GET_CRM_DASHBOARD_STATS = (): string => {
  return `query GetCrmDashboardStats {
    # Count opportunities that are NOT in closed_won or closed_lost stages
    activeOpportunities: OpportunityAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
        stage: { _nin: ["closed_won", "closed_lost"] }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Count all leads (filtered by sourceApp and excluding deleted)
    totalLeads: LeadAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Count all opportunities (filtered by sourceApp and excluding deleted)
    totalOpportunities: OpportunityAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Count all accounts (filtered by sourceApp and excluding deleted)
    totalAccounts: AccountAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Count all contacts (filtered by sourceApp and excluding deleted)
    totalContacts: ContactAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Sum of all estimated amounts for all opportunities (filtered by sourceApp and excluding deleted)
    pipelineValue: OpportunityAggregate(
      where: {
        sourceApp: { _eq: "CRM" }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
  }`
}

export type CrmDashboardStatsData = {
  activeOpportunities: {
    aggregate: {
      count: number
    }
  }
  totalLeads: {
    aggregate: {
      count: number
    }
  }
  totalOpportunities: {
    aggregate: {
      count: number
    }
  }
  totalAccounts: {
    aggregate: {
      count: number
    }
  }
  totalContacts: {
    aggregate: {
      count: number
    }
  }
  pipelineValue: {
    aggregate: {
      sum: {
        estimatedAmount: number
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetCrmDashboardStatsVariables {
  // No variables needed for this query
}

export const useGetCrmDashboardStats = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCrmDashboardStats = async () => {
    const query = GET_CRM_DASHBOARD_STATS()

    try {
      const result = await graphqlClient.request<CrmDashboardStatsData>(query)
      return result
    } catch (error) {
      console.error('Error fetching CRM dashboard stats:', error)
      throw error
    }
  }

  return { fetchCrmDashboardStats }
}
