// Types for Campaigns Analytics

// Timeline period filter options
export type TimelinePeriod = 'last-month' | 'last-quarter' | 'last-6-months' | 'last-year' | 'historical'

export interface TimelinePeriodOption {
  value: TimelinePeriod
  label: string
  days: number
}

export const TIMELINE_PERIODS: TimelinePeriodOption[] = [
  { value: 'last-month', label: 'Last Month', days: 30 },
  { value: 'last-quarter', label: 'Last Quarter', days: 90 }, // 3 months
  { value: 'last-6-months', label: 'Last 6 Months', days: 180 },
  { value: 'last-year', label: 'Last Year', days: 365 },
  { value: 'historical', label: 'Historical', days: 1825 } // 5 years
]

// Shared entity counts interface to eliminate duplication
export interface EntityCounts {
  leadsCount: number
  accountsCount: number
  contactsCount: number
  opportunitiesCount: number
  wonOpportunitiesCount: number
  totalRevenue: number
}

// Shared performance metrics interface
export interface PerformanceMetrics {
  conversionRate: number
  winRate: number
}

export interface CampaignsAnalyticsMetrics {
  totalLeads: number
  totalAccounts: number
  totalContacts: number
  totalOpportunities: number
  totalRevenue: number
  averageConversionRate: number
  averageWinRate: number
  averageCampaignDuration: number
}

export interface CampaignPerformanceComparison extends EntityCounts, PerformanceMetrics {
  campaignId: string
  campaignName: string
  status: string
  startDate: string
  endDate: string
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

export interface TopPerformingCampaign extends EntityCounts, PerformanceMetrics {
  campaignId: string
  campaignName: string
  campaignType: string
  status: string
  rank: number
}

export interface CampaignsAnalyticsData {
  metrics: CampaignsAnalyticsMetrics
  campaignComparisons: CampaignPerformanceComparison[]
  revenueComparisons: CampaignPerformanceComparison[]
  efficiencyComparisons: CampaignPerformanceComparison[]
  timelineAnalysis: CampaignsTimelineData[]
  topCampaigns: TopPerformingCampaign[]
}

// Shared loading/error state interface
export interface LoadingErrorState {
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export interface CampaignsAnalyticsProps extends LoadingErrorState {
  analyticsData: CampaignsAnalyticsData
}

// Use Partial to make all CampaignsAnalyticsData properties optional, plus add loading/error states
export interface CampaignsAnalyticsComponentProps extends Partial<CampaignsAnalyticsData>, LoadingErrorState {}
