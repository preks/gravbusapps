// GraphQL Queries for Campaign Analytics

/** Align `SalesLeadStatus` (or equivalent) catalog entry `code` values with these constants. */
export const LEAD_STATUS_CODE_MQL = 'MQL'
export const LEAD_STATUS_CODE_SQL = 'SQL'
export const LEAD_STATUS_CODE_CONVERTED = 'CONVERTED'
export const OPPORTUNITY_STATUS_CODE_WON = 'WON'

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
          opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
        }
      ) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
      
      # Converted Leads (lead status catalog code CONVERTED)
      convertedLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_CONVERTED}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # MQL and SQL (filtered by lead status catalog codes)
      mqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_MQL}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      sqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_SQL}" } }
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
      
      # Converted Leads (lead status catalog code CONVERTED)
      convertedLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_CONVERTED}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # MQL and SQL (filtered by lead status catalog codes)
      mqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_MQL}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      sqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_SQL}" } }
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
          opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
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
