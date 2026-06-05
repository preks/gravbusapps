export interface KpiTrendData {
  current: number
  previous: number
}

export interface SalesPerformanceKpis {
  totalRevenue: number
  opportunitiesWon: number
  averageOpportunitySize: number
  winRate: number
  currencyCode: string
  // Trend data for 30-day comparison
  trends: {
    totalRevenue: KpiTrendData
    opportunitiesWon: KpiTrendData
    averageOpportunitySize: KpiTrendData
    winRate: KpiTrendData
  }
}

export interface TopPerformer {
  id: string
  name: string
  displayName: string
  picture?: string
  pictureThumbnail?: string
  revenue: number
  opportunitiesWon: number
  currencyCode: string
}

export interface TopTeam {
  id: string
  name: string
  revenue: number
  opportunitiesWon: number
  memberCount: number
  currencyCode: string
}

export interface RevenueTrendData {
  month: string
  pipelineRevenue: number
  wonRevenue: number
  opportunities: number
}

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

// Team Comparison View Types
export interface TeamComparisonData {
  id: string
  name: string
  leadName: string
  revenue: number
  memberCount: number
  opportunitiesCount: number // Total opportunities
  wonOpportunitiesCount: number // Won opportunities only
  winRate: number
  currencyCode: string
  color: string // for chart line color
}

export interface TeamRevenueTrendPoint {
  month: string
  [teamId: string]: number | string // Dynamic team revenue values + month string
}

export interface TeamComparisonResult {
  teams: TeamComparisonData[]
  revenueTrends: TeamRevenueTrendPoint[]
  isLoading: boolean
  error: string | null
}

// Team colors for the chart (max 4 teams) - using direct hex colors for chart compatibility
export const TEAM_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Orange/Yellow
  '#a855f7' // Purple
] as const

// Team Entity Counts Chart Types
export interface TeamEntityCountsPoint {
  entity: string
  [teamId: string]: number | string // Dynamic team count values + entity string
}

// Pipeline Forecast Chart Types
export interface PipelineForecastData {
  month: string
  forecastedRevenue: number
  opportunityCount: number
}
