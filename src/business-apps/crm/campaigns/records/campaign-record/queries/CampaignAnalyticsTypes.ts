// Analytics Data Interfaces
export interface CampaignAnalyticsMetrics {
  totalEntities: {
    leads: number
    accounts: number
    contacts: number
    opportunities: number
  }
  conversionMetrics: {
    leadsConverted: number
    conversionRate: number
    mqlCount: number
    sqlCount: number
  }
  revenueMetrics: {
    totalPipeline: number
    wonRevenue: number
    averageOpportunitySize: number
    winRate: number
  }
  performanceMetrics: {
    activitiesCount: number
    avgDaysToClose: number
  }
}

export interface CampaignConversionFunnel {
  stages: Array<{
    stage: string
    count: number
    percentage: number
    dropoffRate?: number
  }>
}

export interface CampaignRevenueAnalysis {
  monthlyRevenue: Array<{
    month: string
    pipeline: number
    won: number
    lost: number
  }>
  revenueBySource: Array<{
    source: string
    amount: number
    count: number
  }>
}

export interface CampaignTimelineAnalysis {
  selectedRangeStart: string
  selectedRangeEnd: string
  selectedRangeLabel: string
  entityCreationTimeline: Array<{
    date: string
    leads: number
    accounts: number
    contacts: number
    opportunities: number
    cumulativeLeads: number
    cumulativeAccounts: number
    cumulativeContacts: number
    cumulativeOpportunities: number
    dailyRevenue: number
    cumulativeRevenue: number
  }>
}

export interface CampaignRevenueTrendAnalysis {
  selectedRangeStart: string
  selectedRangeEnd: string
  selectedRangeLabel: string
  revenueTimeline: Array<{
    date: string
    dailyRevenue: number
    cumulativeRevenue: number
  }>
}
