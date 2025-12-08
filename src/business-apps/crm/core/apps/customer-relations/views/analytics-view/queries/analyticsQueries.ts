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

// Accounts Analytics Query
export const GET_ACCOUNTS_ANALYTICS = `
  query GetAccountsAnalytics {
    AccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    accountWithOpportunities: AccountAggregate(where: {opportunity: {id: {_isNull: false}}}) {
      aggregate {
        count
      }
    }
    Account(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      name
      createdAt
      industry {
        id
        code
        value
      }
      numberOfEmployees {
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

// Opportunities Analytics Query
export const GET_OPPORTUNITIES_ANALYTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''
  const now = new Date()
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  return `
  query GetOpportunitiesAnalytics {
    totalEstimatedAmount: OpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate {
        count
      }
    }
    Opportunity(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      updatedAt
      stage
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
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
    WonOpportunitiesAndWithCloseDate: Opportunity(
      where: { 
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _isNull: false }${currencyFilter}
      }
    ) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      stage
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
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

    WonOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }${currencyFilter}
      }
    ) {
      aggregate {
        count
      }
    }

    # Previous month opportunities (total and won)
    PreviousMonthOpportunities: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${currencyFilter}
      }
    ) {
      aggregate {
        count
      }
    }

    PreviousMonthWonOpportunities: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${currencyFilter}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
}

// Contacts Analytics Query
// GET_CONTACTS_ANALYTICS removed - Contacts tab now uses useContactsOverTime hook directly

// **NEW: COMBINED ANALYTICS QUERY - Replaces all 5 separate queries above**
export const GET_COMBINED_CRM_ANALYTICS = (
  kpiCurrency?: string,
  accountsCurrency?: string,
  opportunitiesCurrency?: string
) => {
  const kpiCurrencyFilter = kpiCurrency ? `, currency: { code: { _eq: "${kpiCurrency}" } }` : ''
  const accountsCurrencyFilter = accountsCurrency ? `, currency: { code: { _eq: "${accountsCurrency}" } }` : ''
  const opportunitiesCurrencyFilter = opportunitiesCurrency
    ? `, currency: { code: { _eq: "${opportunitiesCurrency}" } }`
    : ''

  const now = new Date()
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  return `
  query GetCombinedCrmAnalytics {
    # ===== OVERVIEW SECTION (for KPIs) =====
    LeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    AccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false }${kpiCurrencyFilter} }) {
      aggregate { count }
    }
    ContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    RecentLeads: Lead(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "2024-01-01T00:00:00Z" }
      },
      limit: 10,
      orderBy: { createdAt: DESC }
    ) {
      id
      createdAt
    }
    RecentOpportunities: Opportunity(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "2024-01-01T00:00:00Z" }${kpiCurrencyFilter}
      },
      limit: 10,
      orderBy: { createdAt: DESC }
    ) {
      id
      createdAt
      estimatedAmount
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }

    # ===== LEADS SECTION =====
    convertedLeads: LeadAggregate(
      where: {
        isDeleted: {_eq: false}, 
        leadStatus: {code: {_eq: "CONVERTED"}}
      }
    ) {
      aggregate { count }
    }
    Lead(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      firstName
      lastName
      email
      createdAt
      leadSourceType
      leadStatus {
        id
        code
        value
      }
      leadSource {
        id
        code
        value
      }
      leadRating {
        id
        code
        value
      }
      annualRevenue {
        id
        code
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }

    # ===== ACCOUNTS SECTION =====
    accountWithOpportunities: AccountAggregate(
      where: {opportunity: {id: {_isNull: false}}}
    ) {
      aggregate { count }
    }
    Account(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      name
      createdAt
      industry {
        id
        code
        value
      }
      numberOfEmployees {
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }

    # ===== OPPORTUNITIES SECTION (KPI Currency) =====
    totalEstimatedAmountKPI: OpportunityAggregate(
      where: { isDeleted: { _eq: false }${kpiCurrencyFilter} }
    ) {
      aggregate {
        sum { estimatedAmount }
      }
    }
    OpportunityKPI: Opportunity(
      where: { isDeleted: { _eq: false }${kpiCurrencyFilter} }
    ) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      updatedAt
      stage
      accountId
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        value
      }
      currency {
        id
        code
        value
      }
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
    WonOpportunitiesAndWithCloseDateKPI: Opportunity(
      where: { 
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _isNull: false }${kpiCurrencyFilter}
      }
    ) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      stage
      accountId
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        value
      }
      currency {
        id
        code
        value
      }
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
    WonOpportunitiesKPI: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }${kpiCurrencyFilter}
      }
    ) {
      aggregate { count }
    }
    PreviousMonthOpportunitiesKPI: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${kpiCurrencyFilter}
      }
    ) {
      aggregate { count }
    }
    PreviousMonthWonOpportunitiesKPI: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${kpiCurrencyFilter}
      }
    ) {
      aggregate { count }
    }

    # ===== OPPORTUNITIES SECTION (Accounts Currency) =====
    OpportunityForAccounts: Opportunity(
      where: { isDeleted: { _eq: false }${accountsCurrencyFilter} }
    ) {
      id
      accountId
      estimatedAmount
      opportunityStatus {
        id
        code
        value
      }
      account {
        id
      }
    }

    # ===== OPPORTUNITIES SECTION (Opportunities Tab Currency) =====
    totalEstimatedAmount: OpportunityAggregate(
      where: { isDeleted: { _eq: false }${opportunitiesCurrencyFilter} }
    ) {
      aggregate {
        sum { estimatedAmount }
      }
    }
    OpportunityForOpportunitiesTab: OpportunityAggregate(
      where: { isDeleted: { _eq: false }${opportunitiesCurrencyFilter} }
    ) {
      aggregate { count }
    }
    Opportunity: Opportunity(
      where: { isDeleted: { _eq: false }${opportunitiesCurrencyFilter} }
    ) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      updatedAt
      stage
      accountId
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        value
      }
      currency {
        id
        code
        value
      }
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
    WonOpportunitiesAndWithCloseDate: Opportunity(
      where: { 
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _isNull: false }${opportunitiesCurrencyFilter}
      }
    ) {
      id
      name
      estimatedAmount
      winningChance
      closeDate
      createdAt
      stage
      accountId
      salesPipelineStage {
        id
        code
        value
      }
      salesPipeline {
        id
        code
        value
      }
      opportunityStatus {
        id
        code
        value
      }
      currency {
        id
        code
        value
      }
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
    WonOpportunities: OpportunityAggregate(
      where: { 
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } }${opportunitiesCurrencyFilter}
      }
    ) {
      aggregate { count }
    }
    PreviousMonthOpportunities: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${opportunitiesCurrencyFilter}
      }
    ) {
      aggregate { count }
    }
    PreviousMonthWonOpportunities: OpportunityAggregate(
      where: {
        isDeleted: { _eq: false },
        opportunityStatus: { code: { _eq: "WON" } },
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }${opportunitiesCurrencyFilter}
      }
    ) {
      aggregate { count }
    }

    # ===== CONTACTS SECTION =====
    Contact(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      firstName
      lastName
      email
      createdAt
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
    ContactsWithoutAccount: ContactAggregate(
      where: { 
        isDeleted: { _eq: false },
        accountId: { _eq: null }
      }
    ) {
      aggregate { count }
    }
  }
`
}
