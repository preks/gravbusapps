// GraphQL Queries for Campaign Analytics

export const GET_CAMPAIGN_ANALYTICS_METRICS = (): string => {
  return `
    query GetCampaignAnalyticsMetrics($campaignId: uuid!) {
      # Total Entities Count
      leadsCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      accountsCount: AccountAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      contactsCount: ContactAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      opportunitiesCount: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Revenue Metrics from Opportunities
      opportunitiesRevenue: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          estimatedAmount: { _gt: 0 }
        }
      ) {
        aggregate {
          sum {
            estimatedAmount
          }
          avg {
            estimatedAmount
          }
          count
        }
      }
      
      # Won Opportunities (assuming status indicates won)
      wonOpportunities: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          opportunityStatus: { value: { _ilike: "%won%" } }
        }
      ) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
      
      # Converted Leads (leads that have related accounts)
      convertedLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          account: {}
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_CAMPAIGN_CONVERSION_FUNNEL = (): string => {
  return `
    query GetCampaignConversionFunnel($campaignId: uuid!) {
      # Total Leads
      totalLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Converted Leads (leads that have related accounts)
      convertedLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          account: {}
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Created Accounts
      createdAccounts: AccountAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Created Contacts
      createdContacts: ContactAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Created Opportunities
      createdOpportunities: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Won Opportunities
      wonOpportunities: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          opportunityStatus: { value: { _ilike: "%won%" } }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_CAMPAIGN_TIMELINE_ANALYSIS = (): string => {
  return `
    query GetCampaignTimelineAnalysis($campaignId: uuid!) {
      leads: Lead(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: ASC }
      ) {
        id
        createdAt
      }
      
      accounts: Account(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: ASC }
      ) {
        id
        createdAt
      }
      
      contacts: Contact(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: ASC }
      ) {
        id
        createdAt
      }
      
      opportunities: Opportunity(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: ASC }
      ) {
        id
        createdAt
        estimatedAmount
        closeDate
      }
    }
  `
}

export const GET_CAMPAIGN_TOP_PERFORMERS = (): string => {
  return `
    query GetCampaignTopPerformers($campaignId: uuid!) {
      # Get all leads with details
      leads: Lead(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          ownerEmployee: {}
        }
      ) {
        id
        account {
          id
        }
        ownerEmployee {
          id
          displayName
        }
      }
      
      # Get all accounts
      accounts: Account(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          ownerEmployee: {}
        }
      ) {
        id
        ownerEmployee {
          id
          displayName
        }
      }
      
      # Get all contacts
      contacts: Contact(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          ownerEmployee: {}
        }
      ) {
        id
        ownerEmployee {
          id
          displayName
        }
      }
      
      # Get all opportunities with status and revenue
      opportunities: Opportunity(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          ownerEmployee: {}
        }
      ) {
        id
        estimatedAmount
        opportunityStatus {
          value
        }
        ownerEmployee {
          id
          displayName
        }
      }
    }
  `
}
