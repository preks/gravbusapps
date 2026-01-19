// Enhanced types that extend base types and add computed fields for customer team performance

import {
  BaseCustomerTeamPerformanceMetrics,
  BaseCustomerActivityPerformance,
  BaseCustomerTeamComparison,
  BaseCustomerPerformancePeriod,
  BaseCustomerPerformanceGoal,
  BaseCustomerTeamPerformanceSummary
} from './customerTeamPerformanceBaseTypes'

// =====================================================
// ENHANCED CUSTOMER TEAM PERFORMANCE TYPES
// =====================================================

// Enhanced team performance metrics with computed fields
export interface CustomerTeamPerformanceMetrics extends BaseCustomerTeamPerformanceMetrics {
  // Computed display fields
  displayName: string
  employeeDisplayName: string
  revenueAchievementPercentage: number
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  formattedRevenue: string
  formattedTarget: string
  currencyLabel: string

  // Computed performance indicators
  performanceLevel: 'excellent' | 'good' | 'average' | 'poor'
  activityEfficiency: number // revenue per activity
  averageScoreRating: 'high' | 'medium' | 'low'

  // Computed trend indicators
  revenueTrend: TrendIndicator
  activityTrend: TrendIndicator
  conversionTrend: TrendIndicator

  // Computed rankings
  revenueRank: number
  activityRank: number
  conversionRank: number
  overallRank: number

  // Computed time-based metrics
  formattedPeriod: string
  daysInPeriod: number
  revenuePerDay: number
  activitiesPerDay: number

  // Computed achievement indicators
  isTopPerformer: boolean
  meetsExpectations: boolean
  needsImprovement: boolean
  improvementAreas: string[]
}

// Enhanced activity performance with computed fields
export interface CustomerActivityPerformance extends BaseCustomerActivityPerformance {
  // Computed display fields
  displayName: string
  activityTitle: string
  performanceCategoryLabel: string
  activityImpactLabel: string
  outcomeTypeLabel: string
  activityTypeLabel: string
  formattedOccurredAt: string
  formattedLoggedAt: string

  // Computed performance indicators
  scoreBadgeColor: string
  scoreBadgeVariant: 'success' | 'warning' | 'error' | 'info'
  performanceLevel: 'excellent' | 'good' | 'average' | 'poor'
  timelinessScore: number // how quickly was activity logged
  qualityScore: number // overall activity quality
  impactScore: number // potential business impact

  // Computed timing metrics
  loggingDelay: number // hours between occurred and logged
  loggingDelayLabel: string
  isTimely: boolean
  isOverdue: boolean

  // Computed revenue impact
  formattedRevenueImpact: string
  revenueImpactLevel: 'high' | 'medium' | 'low' | 'none'

  // Computed follow-up indicators
  requiresFollowUp: boolean
  followUpOverdue: boolean
  formattedNextActionDate: string

  // Computed entity relationships
  relatedEntityType: 'Account' | 'Contact' | 'Lead' | 'Opportunity' | null
  relatedEntityName: string
  relatedEntityUrl: string
}

// Enhanced team comparison with computed fields
export interface CustomerTeamComparison extends BaseCustomerTeamComparison {
  // Computed display fields
  displayName: string
  employeeDisplayName: string
  teamDisplayName: string
  managerDisplayName: string
  performancePercentile: number
  rankingSuffix: string // "1st", "2nd", "3rd", etc.

  // Computed comparison metrics
  aboveTeamAverage: boolean
  aboveDepartmentAverage: boolean
  performanceGap: number // difference from team average
  revenueGap: number // difference from team average
  improvementOpportunity: string

  // Computed performance indicators
  isTopQuartile: boolean
  isBottomQuartile: boolean
  performanceCategory: 'top' | 'above-average' | 'average' | 'below-average' | 'bottom'

  // Computed achievement metrics
  scoreAchievementRate: number // compared to team
  revenueAchievementRate: number // compared to team
  overallAchievementRate: number

  // Computed trend vs team
  trendVsTeam: 'outperforming' | 'matching' | 'underperforming'
  improvementPotential: number // potential improvement percentage
}

// Enhanced performance period with computed fields
export interface CustomerPerformancePeriod extends BaseCustomerPerformancePeriod {
  // Computed display fields
  displayName: string
  periodLabel: string
  formattedPeriodRange: string

  // Computed achievement metrics
  revenueAchievementPercentage: number
  activityAchievementPercentage: number
  leadAchievementPercentage: number
  opportunityAchievementPercentage: number
  overallAchievementPercentage: number

  // Computed performance indicators
  isOnTrack: boolean
  isAheadOfTarget: boolean
  isBehindTarget: boolean
  performanceStatus: 'excellent' | 'on-track' | 'at-risk' | 'behind'

  // Computed progress metrics
  progressPercentage: number // how far through the period
  projectedRevenue: number // projected end-of-period revenue
  projectedActivities: number // projected end-of-period activities

  // Computed efficiency metrics
  revenuePerActivity: number
  conversionRate: number
  winRate: number

  // Computed time-based metrics
  daysRemaining: number
  workingDaysRemaining: number
  dailyRevenueRequired: number // to meet target
  dailyActivitiesRequired: number // to meet target
}

// Enhanced performance goal with computed fields
export interface CustomerPerformanceGoal extends BaseCustomerPerformanceGoal {
  // Computed display fields
  displayName: string
  goalTypeLabel: string
  goalCategoryLabel: string
  formattedTargetValue: string
  formattedCurrentValue: string
  formattedGoalPeriod: string

  // Computed achievement metrics
  achievementPercentage: number
  progressPercentage: number
  remainingToTarget: number

  // Computed status indicators
  isOnTrack: boolean
  isAheadOfSchedule: boolean
  isBehindSchedule: boolean
  isAtRisk: boolean
  goalStatus: 'achieved' | 'on-track' | 'at-risk' | 'behind' | 'failed'

  // Computed time metrics
  daysToGoal: number
  progressRate: number // progress per day
  projectedAchievementDate: string
  projectedFinalValue: number

  // Computed performance indicators
  difficultyLevel: 'easy' | 'moderate' | 'challenging' | 'stretch'
  achievabilityScore: number // 0-100
  motivationLevel: 'high' | 'medium' | 'low'
}

// Enhanced team performance summary with computed fields
export interface CustomerTeamPerformanceSummary extends BaseCustomerTeamPerformanceSummary {
  // Computed display fields
  displayName: string
  teamDisplayName: string
  formattedPeriod: string

  // Computed team metrics
  formattedTotalRevenue: string
  formattedAverageRevenue: string
  revenueDistribution: RevenueDistribution[]
  performanceDistribution: PerformanceDistribution[]

  // Computed achievement indicators
  teamRevenueAchievementPercentage: number
  teamActivityAchievementPercentage: number
  overallTeamPerformance: 'excellent' | 'good' | 'average' | 'poor'

  // Computed team dynamics
  performanceSpread: number // difference between top and bottom
  teamConsistency: 'high' | 'medium' | 'low'
  collaborationScore: number

  // Computed benchmarking
  vsCompanyAverage: number
  vsDepartmentAverage: number
  teamRanking: number

  // Computed improvement opportunities
  topPerformerName: string
  bottomPerformerName: string
  improvementOpportunities: string[]
  teamStrengths: string[]
  teamWeaknesses: string[]
}

// =====================================================
// SUPPORTING TYPES
// =====================================================

// Trend indicator with detailed information
export interface TrendIndicator {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  absoluteChange: number
  isPositive: boolean
  isSignificant: boolean
  description: string
  iconName: string
  color: string
}

// Revenue distribution for team analysis
export interface RevenueDistribution {
  range: string
  count: number
  percentage: number
  employeeIds: string[]
}

// Performance distribution for team analysis
export interface PerformanceDistribution {
  level: 'excellent' | 'good' | 'average' | 'poor'
  count: number
  percentage: number
  employeeIds: string[]
}

// =====================================================
// COLLECTION AND RESPONSE TYPES
// =====================================================

// Query response types
export interface CustomerTeamPerformanceQueryResponse {
  metrics: CustomerTeamPerformanceMetrics[]
  teamComparison: CustomerTeamComparison[]
  periods: CustomerPerformancePeriod[]
  goals: CustomerPerformanceGoal[]
  teamSummary: CustomerTeamPerformanceSummary
  totalCount: number
}

// Activity performance query response
export interface CustomerActivityPerformanceQueryResponse {
  activities: CustomerActivityPerformance[]
  totalCount: number
}

// Team performance statistics
export interface CustomerTeamPerformanceStatistics {
  teamSize: number
  averageRevenue: number
  averageActivityScore: number
  topPerformer: CustomerTeamPerformanceMetrics
  bottomPerformer: CustomerTeamPerformanceMetrics
  revenueDistribution: RevenueDistribution[]
  performanceDistribution: PerformanceDistribution[]
  teamTrends: {
    revenue: TrendIndicator
    activity: TrendIndicator
    conversion: TrendIndicator
  }
}

// Team performance leaderboard
export interface CustomerTeamPerformanceLeaderboard {
  period: string
  metric: 'revenue' | 'activity_score' | 'conversion_rate' | 'overall'
  leaders: Array<{
    rank: number
    employee: CustomerTeamPerformanceMetrics
    score: number
    trend: TrendIndicator
  }>
}

// Performance comparison result
export interface CustomerPerformanceComparison {
  employee: CustomerTeamPerformanceMetrics
  peer: CustomerTeamPerformanceMetrics
  comparison: {
    revenue: TrendIndicator
    activity: TrendIndicator
    conversion: TrendIndicator
    overall: TrendIndicator
  }
  recommendations: string[]
}
