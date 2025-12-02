import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PerformanceStatisticsQueryVariables {
  employeeId: string
  currencyCode?: string
}

// Combined query for all employee performance statistics in one request
// Optional currency filtering: only opportunity-related stats are filtered
export const GET_ALL_PERFORMANCE_STATISTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

  return `
  query GetAllPerformanceStatistics($employeeId: uuid!) {
    # Leads Statistics
    totalLeads: LeadAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId } 
    }) {
      aggregate {
        count
      }
    }
    convertedLeads: LeadAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId },
      leadStatus: { code: { _eq: "CONVERTED" } }
    }) {
      aggregate {
        count
      }
    }
    
    # Contacts Statistics
    totalContacts: ContactAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId } 
    }) {
      aggregate {
        count
      }
    }
    contactsWithSalesActivity: ContactAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId },
      accountId: { _isNull: false }
    }) {
      aggregate {
        count
      }
    }
    
    # Opportunities Statistics (filtered by currency if provided)
    totalOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId }${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    wonOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId },
      opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    
    # Accounts Statistics
    totalAccounts: AccountAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId } 
    }) {
      aggregate {
        count
      }
    }
    accountsRevenue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _eq: $employeeId }${currencyFilter}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    
    # Get currency from first opportunity to standardize currency display
    sampleOpportunity: Opportunity(
      limit: 1,
      where: {
        isDeleted: { _eq: false },
        account: { ownerEmployeeId: { _eq: $employeeId } },
        currencyRef: { _isNull: false }${currencyFilter}
      }
    ) {
      currencyRef
      currency {
        value
        code
      }
    }
  }
`
}

export const usePerformanceStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  return { graphqlClient }
}
