// Types for Campaigns Analytics

export interface CampaignsAnalyticsMetrics {
  totalCampaigns: number
  activeCampaigns: number
  upcomingCampaigns: number
  completedCampaigns: number
  totalLeads: number
  totalAccounts: number
  totalContacts: number
  totalOpportunities: number
  totalRevenue: number
  averageConversionRate: number
  averageWinRate: number
  averageCampaignDuration: number
}

export interface CampaignPerformanceComparison {
  campaignId: string
  campaignName: string
  status: string
  startDate: string
  endDate: string
  leadsCount: number
  accountsCount: number
  contactsCount: number
  opportunitiesCount: number
  wonOpportunitiesCount: number
  totalRevenue: number
  conversionRate: number
  winRate: number
  duration: number
}

export interface CampaignsTimelineData {
  date: string
  campaignsCreated: number
  cumulativeCampaigns: number
  leadsGenerated: number
  cumulativeLeads: number
  accountsCreated: number
  cumulativeAccounts: number
  contactsCreated: number
  cumulativeContacts: number
  opportunitiesCreated: number
  cumulativeOpportunities: number
  dailyRevenue: number
  cumulativeRevenue: number
}

export interface TopPerformingCampaign {
  campaignId: string
  campaignName: string
  campaignType: string
  status: string
  leadsCount: number
  accountsCount: number
  contactsCount: number
  opportunitiesCount: number
  wonOpportunitiesCount: number
  totalRevenue: number
  conversionRate: number
  winRate: number
  rank: number
}

export interface TopPerformingEmployee {
  employeeId: string
  employeeName: string
  campaignsCount: number
  leadsCount: number
  accountsCount: number
  contactsCount: number
  opportunitiesCount: number
  wonOpportunitiesCount: number
  totalRevenue: number
  averageConversionRate: number
  averageWinRate: number
  rank: number
}

export interface CampaignsAnalyticsData {
  metrics: CampaignsAnalyticsMetrics
  campaignComparisons: CampaignPerformanceComparison[]
  timelineAnalysis: CampaignsTimelineData[]
  topCampaigns: TopPerformingCampaign[]
  topEmployees: TopPerformingEmployee[]
}

export interface CampaignsAnalyticsProps {
  analyticsData: CampaignsAnalyticsData
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export interface CampaignsAnalyticsComponentProps {
  metrics?: CampaignsAnalyticsMetrics
  campaignComparisons?: CampaignPerformanceComparison[]
  timelineAnalysis?: CampaignsTimelineData[]
  topCampaigns?: TopPerformingCampaign[]
  topEmployees?: TopPerformingEmployee[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}
