// CRM Overview Analytics Query
export const GET_CRM_OVERVIEW_ANALYTICS = (currencyCode?: string) => {
  const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

  return `
  query GetCrmOverviewAnalytics {
    InvestmentLeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    InvestmentAccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    InvestmentOpportunityAggregate(where: { isDeleted: { _eq: false }${currencyFilter} }) {
      aggregate {
        count
      }
    }
    InvestmentContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    RecentLeads: InvestmentLead(
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
    RecentOpportunities: InvestmentOpportunity(
      where: { 
        isDeleted: { _eq: false },
        createdAt: { _gte: "2024-01-01T00:00:00Z" }${currencyFilter}
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
  }
`
}

// Leads Analytics Query
export const GET_LEADS_ANALYTICS = `
  query GetLeadsAnalytics {
    InvestmentLeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    convertedLeads: InvestmentLeadAggregate(where: {isDeleted: {_eq: false}, leadStatus: {value: {_in: ["Converted", "Qualified"]}}}) {
      aggregate {
        count
      }
    }
    InvestmentLead(where: { isDeleted: { _eq: false } }, limit: 1000) {
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
      accountAnnualRevenueBand {
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
  }
`

// Accounts Analytics Query
export const GET_ACCOUNTS_ANALYTICS = `
  query GetAccountsAnalytics {
    InvestmentAccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    accountWithOpportunities: InvestmentAccountAggregate(where: {investment: {id: {_isNull: false}}}) {
      aggregate {
        count
      }
    }
    InvestmentAccount(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      name
      createdAt
      industryClass {
        id
        code
        value
      }
      companySize { id code value }
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

// Contacts Analytics Query
export const GET_CONTACTS_ANALYTICS = `
  query GetContactsAnalytics {
    InvestmentContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    InvestmentContact(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      firstName
      lastName
      email
      createdAt
      investmentAccountContact { account { id name } }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
    ContactsWithoutAccount: InvestmentContactAggregate(
      where: { 
        isDeleted: { _eq: false },
        investmentAccountContact: { accountId: { _isNull: true } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
