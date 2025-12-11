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
