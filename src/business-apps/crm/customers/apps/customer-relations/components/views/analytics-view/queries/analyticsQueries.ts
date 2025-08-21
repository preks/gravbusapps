// CRM Overview Analytics Query
export const GET_CRM_OVERVIEW_ANALYTICS = `
  query GetCrmOverviewAnalytics {
    LeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    AccountAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    ContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
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
        createdAt: { _gte: "2024-01-01T00:00:00Z" }
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
`;

// Leads Analytics Query
export const GET_LEADS_ANALYTICS = `
  query GetLeadsAnalytics {
    LeadAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    convertedLeads: LeadAggregate(where: {isDeleted: {_eq: false}, leadStatus: {code: {_eq: "CONVERTED"}}}) {
      aggregate {
        count
      }
    }
    Lead(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      firstName
      lastName
      email
      createdAt
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
  }
`;

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
`;

// Opportunities Analytics Query
export const GET_OPPORTUNITIES_ANALYTICS = (() => {
  const now = new Date();
  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  ).toISOString();
  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  return `
  query GetOpportunitiesAnalytics {
    totalEstimatedAmount: OpportunityAggregate {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
    Opportunity(where: { isDeleted: { _eq: false } }) {
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
    WonOpportunitiesAndWithCloseDate: Opportunity(
      where: { 
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _isNull: false }
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
        opportunityStatus: { code: { _eq: "WON" } }
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
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }
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
        createdAt: { _gte: "${previousMonthStart}", _lt: "${currentMonthStart}" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
})();

// Contacts Analytics Query
export const GET_CONTACTS_ANALYTICS = `
  query GetContactsAnalytics {
    ContactAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
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
      aggregate {
        count
      }
    }
  }
`;
