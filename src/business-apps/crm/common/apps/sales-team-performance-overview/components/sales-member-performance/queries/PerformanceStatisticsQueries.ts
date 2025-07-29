import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface PerformanceStatisticsQueryVariables {
  employeeId: string;
}

// 1) Leads Worked: Total count + Converted count
export const GET_LEADS_STATISTICS = `
  query GetLeadsStatistics($employeeId: uuid!) {
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
  }
`;

// 2) Contacts Worked: Total count + Contacts with sales activities (simplified metric)
export const GET_CONTACTS_STATISTICS = `
  query GetContactsStatistics($employeeId: uuid!) {
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
  }
`;

// 3) Opportunities Managed: Total count + Won count
export const GET_OPPORTUNITIES_STATISTICS = `
  query GetOpportunitiesStatistics($employeeId: uuid!) {
    totalOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId } 
    }) {
      aggregate {
        count
      }
    }
    wonOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId },
      opportunityStatus: { code: { _eq: "WON" } }
    }) {
      aggregate {
        count
      }
    }
  }
`;

// 4) Accounts Managed: Total count + Sum of won opportunity values (Sales)
export const GET_ACCOUNTS_STATISTICS = `
  query GetAccountsStatistics($employeeId: uuid!) {
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
      ownerEmployeeId: { _eq: $employeeId }
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
  }
`;

// Combined query for better performance - fetch all statistics in one request
export const GET_ALL_PERFORMANCE_STATISTICS = `
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
    
    # Opportunities Statistics
    totalOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId } 
    }) {
      aggregate {
        count
      }
    }
    wonOpportunities: OpportunityAggregate(where: { 
      isDeleted: { _eq: false }, 
      ownerEmployeeId: { _eq: $employeeId },
      opportunityStatus: { code: { _eq: "WON" } }
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
      ownerEmployeeId: { _eq: $employeeId }
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
        currencyRef: { _isNull: false }
      }
    ) {
      currencyRef
      currency {
        value
        code
      }
    }
  }
`;

export const usePerformanceStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  return { graphqlClient };
}; 