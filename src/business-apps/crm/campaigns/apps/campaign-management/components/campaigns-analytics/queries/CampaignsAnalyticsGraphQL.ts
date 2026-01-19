// GraphQL Queries for Campaigns Analytics

export const GET_CAMPAIGNS_ANALYTICS_METRICS = (): string => {
  return `
    query GetCampaignsAnalyticsMetrics {
      # Total campaigns count
      totalCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Active campaigns count
      activeCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false }
          startDate: { _lte: "now()" }
          endDate: { _gte: "now()" }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Upcoming campaigns count
      upcomingCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false }
          startDate: { _gt: "now()" }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Completed campaigns count
      completedCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false }
          endDate: { _lt: "now()" }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Get all campaigns and their actual entity counts (same approach as other queries)
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
        }
      ) {
        id
        name
        startDate
        endDate
        
        # Get actual entity counts for each campaign using proper relationships
        leadAggregate {
          aggregate {
            count
          }
        }
        
        accountAggregate {
          aggregate {
            count
          }
        }
        
        contactAggregate {
          aggregate {
            count
          }
        }
        
        opportunityAggregate {
          aggregate {
            count
          }
        }
        
        # Get revenue from won opportunities
        wonOpportunityAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _eq: "Won" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate {
            count
            sum {
              estimatedAmount
            }
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_PERFORMANCE_COMPARISON = (): string => {
  return `
    query GetCampaignsPerformanceComparison {
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
        limit: 5
      ) {
        id
        name
        typeRef
        startDate
        endDate
        createdAt
        
        # Leads count
        leadAggregate {
          aggregate {
            count
          }
        }
        
        # Accounts count
        accountAggregate {
          aggregate {
            count
          }
        }
        
        # Contacts count
        contactAggregate {
          aggregate {
            count
          }
        }
        
        # Opportunities count
        opportunityAggregate {
          aggregate {
            count
          }
        }
        
        # Won opportunities count
        wonOpportunityAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
          }
        ) {
          aggregate {
            count
          }
        }
        
        # Revenue from won opportunities
        revenueAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate {
            sum {
              estimatedAmount
            }
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_REVENUE_ANALYSIS = (): string => {
  return `
    query GetCampaignsRevenueAnalysis {
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
          # Only campaigns with won opportunities that have revenue
          opportunity: {
            opportunityStatus: { value: { _ilike: "%won%" } }
            estimatedAmount: { _gt: 0 }
          }
        }
        orderBy: [{ createdAt: DESC }]
        limit: 5
      ) {
        id
        name
        typeRef
        startDate
        endDate
        createdAt
        
        # Leads count
        leadAggregate {
          aggregate {
            count
          }
        }
        
        # Accounts count
        accountAggregate {
          aggregate {
            count
          }
        }
        
        # Contacts count
        contactAggregate {
          aggregate {
            count
          }
        }
        
        # Opportunities count
        opportunityAggregate {
          aggregate {
            count
          }
        }
        
        # Won opportunities count
        wonOpportunityAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
          }
        ) {
          aggregate {
            count
          }
        }
        
        # Revenue from won opportunities
        revenueAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate {
            sum {
              estimatedAmount
            }
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_EFFICIENCY_ANALYSIS = (): string => {
  return `
    query GetCampaignsEfficiencyAnalysis {
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
          # Only campaigns with revenue, leads, and opportunities
          _and: [
            {
              opportunity: {
                opportunityStatus: { value: { _ilike: "%won%" } }
                estimatedAmount: { _gt: 0 }
              }
            }
            { lead: { id: { _isNull: false } } }
            { opportunity: { id: { _isNull: false } } }
          ]
        }
        orderBy: [{ createdAt: DESC }]
        limit: 5
      ) {
        id
        name
        typeRef
        startDate
        endDate
        createdAt
        
        # Leads count
        leadAggregate {
          aggregate {
            count
          }
        }
        
        # Accounts count
        accountAggregate {
          aggregate {
            count
          }
        }
        
        # Contacts count
        contactAggregate {
          aggregate {
            count
          }
        }
        
        # Opportunities count
        opportunityAggregate {
          aggregate {
            count
          }
        }
        
        # Won opportunities count
        wonOpportunityAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
          }
        ) {
          aggregate {
            count
          }
        }
        
        # Revenue from won opportunities
        revenueAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate {
            sum {
              estimatedAmount
            }
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_TIMELINE_ANALYSIS = (startDate?: string): string => {
  // Build where clause with optional date filter
  const whereClause = startDate
    ? `where: { 
        isDeleted: { _eq: false }
        startDate: { _gte: "${startDate}" }
      }`
    : `where: { 
        isDeleted: { _eq: false }
      }`

  return `
    query GetCampaignsTimelineAnalysis {
      # Campaigns timeline - same structure as employee query for consistency
      campaigns: SalesCampaign(
        ${whereClause}
        orderBy: [{ createdAt: ASC }]
      ) {
        id
        name
        createdAt
        startDate
        endDate
        
        # Get leads for this campaign
        lead(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ createdAt: ASC }]
        ) {
          id
          createdAt
        }
        
        # Get accounts for this campaign
        account(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ createdAt: ASC }]
        ) {
          id
          createdAt
        }
        
        # Get contacts for this campaign
        contact(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ createdAt: ASC }]
        ) {
          id
          createdAt
        }
        
        # Get opportunities for this campaign with revenue data
        opportunity(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ createdAt: ASC }]
        ) {
          id
          createdAt
          estimatedAmount
          opportunityStatus {
            value
          }
        }
      }
    }
  `
}

export const GET_TOP_PERFORMING_CAMPAIGNS = (): string => {
  return `
    query GetTopPerformingCampaigns {
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
        limit: 10
      ) {
        id
        name
        typeRef
        type {
          id
          value
          code
        }
        startDate
        endDate
        createdAt
        
        # Leads count
        leadAggregate {
          aggregate {
            count
          }
        }
        
        # Accounts count
        accountAggregate {
          aggregate {
            count
          }
        }
        
        # Contacts count
        contactAggregate {
          aggregate {
            count
          }
        }
        
        # Opportunities count
        opportunityAggregate {
          aggregate {
            count
          }
        }
        
        # Won opportunities count
        wonOpportunityAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
          }
        ) {
          aggregate {
            count
          }
        }
        
        # Revenue from won opportunities
        revenueAggregate: opportunityAggregate(
          where: { 
            opportunityStatus: { value: { _ilike: "%won%" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate {
            sum {
              estimatedAmount
            }
          }
        }
      }
    }
  `
}

export const GET_TOP_PERFORMING_EMPLOYEES = (): string => {
  return `
    query GetTopPerformingEmployees {
      # Get all campaigns first
      campaigns: SalesCampaign(
        where: { 
          isDeleted: { _eq: false }
        }
      ) {
        id
        name
        
        # Get leads for each campaign (similar to individual campaign analytics)
        lead(
          where: { 
            isDeleted: { _eq: false }
            ownerEmployee: { isDeleted: { _eq: false } }
          }
        ) {
          id
          ownerEmployee {
            id
            displayName
            firstName
            lastName
          }
          account {
            id
          }
        }
        
        # Get accounts for each campaign
        account(
          where: { 
            isDeleted: { _eq: false }
            ownerEmployee: { isDeleted: { _eq: false } }
          }
        ) {
          id
          ownerEmployee {
            id
            displayName
            firstName
            lastName
          }
        }
        
        # Get contacts for each campaign
        contact(
          where: { 
            isDeleted: { _eq: false }
            ownerEmployee: { isDeleted: { _eq: false } }
          }
        ) {
          id
          ownerEmployee {
            id
            displayName
            firstName
            lastName
          }
        }
        
        # Get opportunities for each campaign
        opportunity(
          where: { 
            isDeleted: { _eq: false }
            ownerEmployee: { isDeleted: { _eq: false } }
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
            firstName
            lastName
          }
        }
      }
    }
  `
}
