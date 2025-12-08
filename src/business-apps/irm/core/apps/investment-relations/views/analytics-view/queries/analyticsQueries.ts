// Overview Tab Only - Single optimized query with all trend data and metrics
export const GET_IRM_OVERVIEW_ONLY_ANALYTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

  // Calculate date ranges for last 30 days comparison (simpler than calendar months)
  const now = new Date()
  const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  return `
  query GetIrmOverviewOnlyAnalytics {
    # Current total entity counts
    InvestmentLeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    InvestmentAccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    InvestmentOpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate { count }
    }
    InvestmentContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    
    # Last 30 days entity counts
    Last30DaysLeads: InvestmentLeadAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    Last30DaysAccounts: InvestmentAccountAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    Last30DaysOpportunities: InvestmentOpportunityAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${last30DaysStart}" }${currencyFilter} }
    ) {
      aggregate { count }
    }
    Last30DaysContacts: InvestmentContactAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    
    # Previous 30 days entity counts
    Previous30DaysLeads: InvestmentLeadAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    Previous30DaysAccounts: InvestmentAccountAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    Previous30DaysOpportunities: InvestmentOpportunityAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter} }
    ) {
      aggregate { count }
    }
    Previous30DaysContacts: InvestmentContactAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" } }
    ) {
      aggregate { count }
    }
    
    # Won opportunities - all time (for overall metrics)
    WonOpportunities: InvestmentOpportunityAggregate(
      where: { isDeleted: { _eq: false }, opportunityStatus: { code: { _eq: "WON" } }${currencyFilter} }
    ) {
      aggregate { count sum { estimatedAmount } }
    }
    
    # Won opportunities - last 30 days (with sum for revenue)
    Last30DaysWonOpportunities: InvestmentOpportunityAggregate(
      where: { isDeleted: { _eq: false }, opportunityStatus: { code: { _eq: "WON" } }, createdAt: { _gte: "${last30DaysStart}" }${currencyFilter} }
    ) {
      aggregate { count sum { estimatedAmount } }
    }
    
    # Won opportunities - previous 30 days (with sum for revenue)
    Previous30DaysWonOpportunities: InvestmentOpportunityAggregate(
      where: { isDeleted: { _eq: false }, opportunityStatus: { code: { _eq: "WON" } }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }${currencyFilter} }
    ) {
      aggregate { count sum { estimatedAmount } }
    }
    
    # Converted leads - last 30 days
    Last30DaysConvertedLeads: InvestmentLeadAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${last30DaysStart}" }, leadStatus: { value: { _in: ["Converted", "Qualified"] } } }
    ) {
      aggregate { count }
    }
    
    # Converted leads - previous 30 days
    Previous30DaysConvertedLeads: InvestmentLeadAggregate(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: "${previous30DaysStart}", _lt: "${last30DaysStart}" }, leadStatus: { value: { _in: ["Converted", "Qualified"] } } }
    ) {
      aggregate { count }
    }
    
    # Geographic Distribution - Top Countries (using distinctOn for efficiency)
    accountAddresses: InvestmentAddress(
      distinctOn: [accountId, countryRef]
      where: { isDeleted: { _eq: false }, accountId: { _isNull: false }, country: { value: { _isNull: false } } }
    ) {
      accountId
      country { value }
    }
  }
`
}

// Opportunities Analytics Query (for Opportunities Tab only)
export const GET_OPPORTUNITIES_ANALYTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''
  const now = new Date()
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  return `
  query GetOpportunitiesAnalytics {
    totalEstimatedAmount: InvestmentOpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    InvestmentOpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate {
        count
      }
    }
    WonOpportunitiesValue: InvestmentOpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
      }
    ) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    InvestmentOpportunity(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      id
      name
      estimatedAmount
      closeDate
      createdAt
      updatedAt
      opportunityPipelineStage {
        id
        code
        value
      }
      opportunityPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        alternativeCode
        value
      }
      currency {
        id
        code
        value
      }
      accountId
      account {
        id
        name
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
    WonOpportunitiesAndWithCloseDate: InvestmentOpportunity(
      where: { 
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _isNull: false }
      }
    ) {
      id
      name
      estimatedAmount
      closeDate
      createdAt
      opportunityPipelineStage {
        id
        code
        value
      }
      opportunityPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        alternativeCode
        value
      }
      currency {
        id
        code
        value
      }
      accountId
      account {
        id
        name
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }

    WonOpportunities: InvestmentOpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      aggregate {
        count
      }
    }

    # Previous month opportunities (total and won)
    PreviousMonthOpportunities: InvestmentOpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }
      }
    ) {
      aggregate {
        count
      }
    }

    PreviousMonthWonOpportunities: InvestmentOpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
}
