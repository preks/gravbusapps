// Overview Tab Only - Lightweight query for initial load with trend data
export const GET_OVERVIEW_ONLY_ANALYTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

  // Calculate date ranges for last 30 days comparison
  const now = new Date()
  const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  return `
  query GetOverviewOnlyAnalytics {
    # Current total entity counts
    LeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    AccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate { count }
    }
    ContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    
    # Last 30 days entity counts for trend
    Last30DaysLeads: LeadAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    Last30DaysAccounts: AccountAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    Last30DaysOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
      }
    ) {
      aggregate { count }
    }
    Last30DaysContacts: ContactAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    
    # Previous 30 days entity counts for trend comparison
    Previous30DaysLeads: LeadAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    Previous30DaysAccounts: AccountAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    Previous30DaysOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter}
      }
    ) {
      aggregate { count }
    }
    Previous30DaysContacts: ContactAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }
      }
    ) {
      aggregate { count }
    }
    
    # Won opportunities - all time
    WonOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
      }
    ) {
      aggregate { 
        count 
        sum { estimatedAmount }
      }
    }
    
    # Won opportunities - last 30 days
    Last30DaysWonOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${last30DaysStart}" }${currencyFilter}
      }
    ) {
      aggregate { 
        count 
        sum { estimatedAmount }
      }
    }
    
    # Won opportunities - previous 30 days
    Previous30DaysWonOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter}
      }
    ) {
      aggregate { 
        count 
        sum { estimatedAmount }
      }
    }
    
    # Converted leads - last 30 days
    Last30DaysConvertedLeads: LeadAggregate(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "${last30DaysStart}" },
        leadStatus: { value: { _in: ["Converted", "Qualified"] } }
      }
    ) {
      aggregate { count }
    }
    
            # Converted leads - previous 30 days
            Previous30DaysConvertedLeads: LeadAggregate(
              where: { 
                isDeleted: { _eq: false },
                createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" },
                leadStatus: { value: { _in: ["Converted", "Qualified"] } }
              }
            ) {
              aggregate { count }
            }
            
            # Geographic Distribution - Top 5 Countries by Accounts
            # Use distinctOn to get unique account-country pairs (much faster than fetching all addresses)
            accountAddresses: CrmAddress(
              distinctOn: [accountId, countryRef]
              where: {
                isDeleted: { _eq: false },
                accountId: { _isNull: false },
                country: { value: { _isNull: false } }
              }
            ) {
              accountId
              country {
                value
              }
            }
          }
        `
}

// REMOVED: GET_ACCOUNTS_ANALYTICS - No longer used
// Accounts data now fetched via dedicated aggregate hooks:
// - useAccountsStaticData: KPIs and trends
// - useAccountsOverTime: lifecycle chart data

// REMOVED: GET_OPPORTUNITIES_ANALYTICS - No longer used
// Opportunities data now fetched via dedicated aggregate hooks:
// - useOpportunitiesStaticData: KPIs and trends
// - useOpportunitiesOverTime: lifecycle chart data
// - useOpportunitiesByStage: stage distribution

// REMOVED: GET_COMBINED_CRM_ANALYTICS - No longer used
// All analytics data now fetched via dedicated hooks for each tab instead of one mega query
