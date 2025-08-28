// Customer team performance mappers - Transform base types to enhanced types with computed fields

import {
  BaseCustomerTeamPerformanceMetrics,
  BaseCustomerActivityPerformance,
  BaseCustomerTeamComparison,
  BaseCustomerPerformancePeriod,
  BaseCustomerPerformanceGoal,
  BaseCustomerTeamPerformanceSummary,
  CustomerTeamPerformanceMetrics,
  CustomerActivityPerformance,
  CustomerTeamComparison,
  CustomerPerformancePeriod,
  CustomerPerformanceGoal,
  CustomerTeamPerformanceSummary,
  TrendIndicator
} from '../types';

import {
  formatCustomerRevenue,
  calculateCustomerRevenueAchievementPercentage,
  getCustomerRevenuePerformanceGrade,
  calculateCustomerRevenuePerDay
} from '../utils/customerRevenueCalculations';

import {
  getCachedCustomerActivityScore,
  getCustomerActivityPerformanceLevel,
  getCustomerActivityScoreBadgeColor,
  getCustomerActivityScoreBadgeVariant,
  calculateCustomerActivityLoggingDelay,
  formatCustomerActivityLoggingDelay,
  isCustomerActivityLoggingTimely
} from '../utils/customerActivityScoring';

import {
  calculateCustomerPerformanceTrend,
  compareCustomerPerformanceToTeam,
  calculateCustomerPercentageChange
} from '../utils/customerTrendAnalysis';

/**
 * Transform BaseCustomerTeamPerformanceMetrics to CustomerTeamPerformanceMetrics with computed fields
 */
export function toCustomerTeamPerformanceMetrics(
  base: BaseCustomerTeamPerformanceMetrics,
  previousPeriodData?: BaseCustomerTeamPerformanceMetrics,
  teamAverages?: { revenue: number; activityScore: number; conversionRate: number }
): CustomerTeamPerformanceMetrics {
  // Extract labels from catalog entries and employee references
  const employeeDisplayName = base.employee?.displayName || 
    `${base.employee?.firstName || ''} ${base.employee?.lastName || ''}`.trim() || 'Unknown Employee';
  const currencyLabel = base.currency?.value || base.currency?.code || 'EUR';
  
  // Calculate computed metrics
  const revenueAchievementPercentage = calculateCustomerRevenueAchievementPercentage(
    base.totalRevenue || 0,
    base.revenueTarget || 0
  );
  
  const performanceGrade = getCustomerRevenuePerformanceGrade(revenueAchievementPercentage);
  
  // Format display values
  const formattedRevenue = formatCustomerRevenue(base.totalRevenue || 0, base.currencyId || 'EUR');
  const formattedTarget = formatCustomerRevenue(base.revenueTarget || 0, base.currencyId || 'EUR');
  
  // Calculate performance indicators
  const activityEfficiency = base.activityCount && base.activityCount > 0 
    ? Math.round((base.totalRevenue || 0) / base.activityCount)
    : 0;
  
  const averageScoreRating: 'high' | 'medium' | 'low' = 
    (base.averageActivityScore || 0) >= 80 ? 'high' :
    (base.averageActivityScore || 0) >= 60 ? 'medium' : 'low';
  
  // Calculate trend indicators
  const revenueTrend: TrendIndicator = previousPeriodData 
    ? calculateCustomerPerformanceTrend(
        base.totalRevenue || 0,
        previousPeriodData.totalRevenue || 0,
        'revenue'
      )
    : {
        direction: 'stable',
        percentage: 0,
        absoluteChange: 0,
        isPositive: true,
        isSignificant: false,
        description: 'No previous period data',
        iconName: 'minus',
        color: '#8c8c8c'
      };
  
  const activityTrend: TrendIndicator = previousPeriodData 
    ? calculateCustomerPerformanceTrend(
        base.averageActivityScore || 0,
        previousPeriodData.averageActivityScore || 0,
        'activity_score'
      )
    : {
        direction: 'stable',
        percentage: 0,
        absoluteChange: 0,
        isPositive: true,
        isSignificant: false,
        description: 'No previous period data',
        iconName: 'minus',
        color: '#8c8c8c'
      };
  
  const conversionTrend: TrendIndicator = previousPeriodData 
    ? calculateCustomerPerformanceTrend(
        base.leadConversionRate || 0,
        previousPeriodData.leadConversionRate || 0,
        'conversion_rate'
      )
    : {
        direction: 'stable',
        percentage: 0,
        absoluteChange: 0,
        isPositive: true,
        isSignificant: false,
        description: 'No previous period data',
        iconName: 'minus',
        color: '#8c8c8c'
      };
  
  // Calculate time-based metrics
  const periodStart = base.periodStart ? new Date(base.periodStart) : new Date();
  const periodEnd = base.periodEnd ? new Date(base.periodEnd) : new Date();
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  
  const formattedPeriod = base.periodType === 'monthly' ? 'This Month' :
                         base.periodType === 'quarterly' ? 'This Quarter' :
                         base.periodType === 'yearly' ? 'This Year' : 'Period';
  
  const revenuePerDay = calculateCustomerRevenuePerDay(
    base.totalRevenue || 0,
    base.periodStart || new Date().toISOString(),
    base.periodEnd || new Date().toISOString()
  );
  
  const activitiesPerDay = daysInPeriod > 0 
    ? Math.round((base.activityCount || 0) / daysInPeriod)
    : 0;
  
  // Calculate achievement indicators
  const isTopPerformer = revenueAchievementPercentage >= 120 && (base.averageActivityScore || 0) >= 85;
  const meetsExpectations = revenueAchievementPercentage >= 80 && (base.averageActivityScore || 0) >= 70;
  const needsImprovement = revenueAchievementPercentage < 70 || (base.averageActivityScore || 0) < 60;
  
  // Generate improvement areas
  const improvementAreas: string[] = [];
  if ((base.totalRevenue || 0) < (base.revenueTarget || 0) * 0.8) {
    improvementAreas.push('Revenue generation');
  }
  if ((base.averageActivityScore || 0) < 70) {
    improvementAreas.push('Activity quality');
  }
  if ((base.leadConversionRate || 0) < 20) {
    improvementAreas.push('Lead conversion');
  }
  if ((base.opportunityWinRate || 0) < 30) {
    improvementAreas.push('Opportunity closing');
  }
  
  // Placeholder rankings (would be calculated in the hook with full team data)
  const revenueRank = 1;
  const activityRank = 1;
  const conversionRank = 1;
  const overallRank = 1;
  
  // Determine performance level
  const performanceLevel = isTopPerformer ? 'excellent' :
                          meetsExpectations ? 'good' :
                          needsImprovement ? 'poor' : 'average';
  
  // Create computed display name
  const displayName = base.employee?.displayName || employeeDisplayName || `Employee ${base.employeeId}`;

  return {
    ...base,
    
    // Computed display fields
    displayName,
    employeeDisplayName,
    revenueAchievementPercentage,
    performanceGrade,
    formattedRevenue,
    formattedTarget,
    currencyLabel,
    
    // Computed performance indicators
    performanceLevel,
    activityEfficiency,
    averageScoreRating,
    
    // Computed trend indicators
    revenueTrend,
    activityTrend,
    conversionTrend,
    
    // Computed rankings
    revenueRank,
    activityRank,
    conversionRank,
    overallRank,
    
    // Computed time-based metrics
    formattedPeriod,
    daysInPeriod,
    revenuePerDay,
    activitiesPerDay,
    
    // Computed achievement indicators
    isTopPerformer,
    meetsExpectations,
    needsImprovement,
    improvementAreas
  };
}

/**
 * Transform BaseCustomerActivityPerformance to CustomerActivityPerformance with computed fields
 */
export function toCustomerActivityPerformance(
  base: BaseCustomerActivityPerformance
): CustomerActivityPerformance {
  // Extract labels from catalog entries
  const activityTypeLabel = base.activityType?.value || base.activityType?.code || 'Unknown';
  const performanceCategoryLabel = base.activityCategory || 'Unknown';
  const activityImpactLabel = base.activityImpact || 'Unknown';
  const outcomeTypeLabel = base.outcomeType || 'Unknown';
  
  // Calculate activity score if not provided
  const activityScore = base.activityScore || 
    (base.activityId && base.loggedAt ? getCachedCustomerActivityScore(base.activityId, base.loggedAt) : 0);
  
  // Calculate performance indicators
  const performanceLevel = getCustomerActivityPerformanceLevel(activityScore);
  const scoreBadgeColor = getCustomerActivityScoreBadgeColor(activityScore);
  const scoreBadgeVariant = getCustomerActivityScoreBadgeVariant(activityScore);
  
  // Calculate timing metrics
  const loggingDelay = base.occurredAt && base.loggedAt 
    ? calculateCustomerActivityLoggingDelay(base.loggedAt, base.occurredAt)
    : 0;
  const loggingDelayLabel = formatCustomerActivityLoggingDelay(loggingDelay);
  const isTimely = isCustomerActivityLoggingTimely(loggingDelay);
  const isOverdue = loggingDelay > 168; // More than 1 week
  
  // Format dates
  const formattedOccurredAt = base.occurredAt 
    ? new Date(base.occurredAt).toLocaleDateString()
    : '';
  const formattedLoggedAt = base.loggedAt 
    ? new Date(base.loggedAt).toLocaleDateString()
    : '';
  
  // Format revenue impact
  const formattedRevenueImpact = base.relatedOpportunityValue 
    ? formatCustomerRevenue(base.relatedOpportunityValue, 'EUR')
    : 'No direct impact';
  
  const revenueImpactLevel: 'high' | 'medium' | 'low' | 'none' = 
    !base.relatedOpportunityValue ? 'none' :
    base.relatedOpportunityValue >= 50000 ? 'high' :
    base.relatedOpportunityValue >= 10000 ? 'medium' : 'low';
  
  // Calculate quality and impact scores
  const timelinessScore = isTimely ? 100 : Math.max(0, 100 - (loggingDelay * 2));
  const qualityScore = activityScore;
  const impactScore = base.contributesToRevenue ? 
    (base.relatedOpportunityValue ? Math.min(100, (base.relatedOpportunityValue / 10000) * 20) : 50) : 25;
  
  // Follow-up indicators
  const requiresFollowUp = base.nextActionRequired || false;
  const followUpOverdue = base.nextActionDate ? 
    new Date(base.nextActionDate) < new Date() : false;
  const formattedNextActionDate = base.nextActionDate ? 
    new Date(base.nextActionDate).toLocaleDateString() : '';
  
  // Related entity information
  let relatedEntityType: 'Account' | 'Contact' | 'Lead' | 'Opportunity' | null = null;
  let relatedEntityName = '';
  let relatedEntityUrl = '';
  
  if (base.relatedAccountId) {
    relatedEntityType = 'Account';
    relatedEntityName = 'Account';
    relatedEntityUrl = `/accounts/${base.relatedAccountId}`;
  } else if (base.relatedContactId) {
    relatedEntityType = 'Contact';
    relatedEntityName = 'Contact';
    relatedEntityUrl = `/contacts/${base.relatedContactId}`;
  } else if (base.relatedLeadId) {
    relatedEntityType = 'Lead';
    relatedEntityName = 'Lead';
    relatedEntityUrl = `/leads/${base.relatedLeadId}`;
  } else if (base.relatedOpportunityId) {
    relatedEntityType = 'Opportunity';
    relatedEntityName = 'Opportunity';
    relatedEntityUrl = `/opportunities/${base.relatedOpportunityId}`;
  }
  
  // Create computed display name
  const displayName = `${activityTypeLabel} Activity`;
  const activityTitle = displayName;

  return {
    ...base,
    
    // Computed display fields
    displayName,
    activityTitle,
    performanceCategoryLabel,
    activityImpactLabel,
    outcomeTypeLabel,
    activityTypeLabel,
    formattedOccurredAt,
    formattedLoggedAt,
    
    // Computed performance indicators
    scoreBadgeColor,
    scoreBadgeVariant,
    performanceLevel,
    timelinessScore,
    qualityScore,
    impactScore,
    
    // Computed timing metrics
    loggingDelay,
    loggingDelayLabel,
    isTimely,
    isOverdue,
    
    // Computed revenue impact
    formattedRevenueImpact,
    revenueImpactLevel,
    
    // Computed follow-up indicators
    requiresFollowUp,
    followUpOverdue,
    formattedNextActionDate,
    
    // Computed entity relationships
    relatedEntityType,
    relatedEntityName,
    relatedEntityUrl
  };
}

/**
 * Transform BaseCustomerTeamComparison to CustomerTeamComparison with computed fields
 */
export function toCustomerTeamComparison(
  base: BaseCustomerTeamComparison
): CustomerTeamComparison {
  // Extract display names
  const employeeDisplayName = base.employee?.displayName || 
    `${base.employee?.firstName || ''} ${base.employee?.lastName || ''}`.trim() || 'Unknown Employee';
  const teamDisplayName = base.team?.name || 'Unknown Team';
  const managerDisplayName = base.manager?.displayName || 
    `${base.manager?.firstName || ''} ${base.manager?.lastName || ''}`.trim() || 'Unknown Manager';
  
  // Calculate comparison metrics
  const performancePercentile = base.scorePercentile || 0;
  const aboveTeamAverage = (base.employeeScore || 0) > (base.teamAverageScore || 0);
  const aboveDepartmentAverage = (base.employeeScore || 0) > (base.departmentAverageScore || 0);
  
  const performanceGap = (base.employeeScore || 0) - (base.teamAverageScore || 0);
  const revenueGap = (base.employeeRevenue || 0) - (base.teamTotalRevenue || 0) / (base.teamSize || 1);
  
  // Generate ranking suffix
  const rank = base.employeeRank || 1;
  let rankingSuffix: string;
  if (rank % 10 === 1 && rank % 100 !== 11) rankingSuffix = `${rank}st`;
  else if (rank % 10 === 2 && rank % 100 !== 12) rankingSuffix = `${rank}nd`;
  else if (rank % 10 === 3 && rank % 100 !== 13) rankingSuffix = `${rank}rd`;
  else rankingSuffix = `${rank}th`;
  
  // Determine performance category
  let performanceCategory: 'top' | 'above-average' | 'average' | 'below-average' | 'bottom';
  if (performancePercentile >= 80) performanceCategory = 'top';
  else if (performancePercentile >= 60) performanceCategory = 'above-average';
  else if (performancePercentile >= 40) performanceCategory = 'average';
  else if (performancePercentile >= 20) performanceCategory = 'below-average';
  else performanceCategory = 'bottom';
  
  // Calculate quartile indicators
  const isTopQuartile = performancePercentile >= 75;
  const isBottomQuartile = performancePercentile <= 25;
  
  // Calculate achievement rates
  const scoreAchievementRate = base.teamAverageScore && base.teamAverageScore > 0 
    ? Math.round(((base.employeeScore || 0) / base.teamAverageScore) * 100)
    : 0;
  
  const revenueAchievementRate = base.teamTotalRevenue && base.teamSize && base.teamSize > 0 
    ? Math.round(((base.employeeRevenue || 0) / (base.teamTotalRevenue / base.teamSize)) * 100)
    : 0;
  
  const overallAchievementRate = Math.round((scoreAchievementRate + revenueAchievementRate) / 2);
  
  // Determine trend vs team
  let trendVsTeam: 'outperforming' | 'matching' | 'underperforming';
  if (overallAchievementRate >= 110) trendVsTeam = 'outperforming';
  else if (overallAchievementRate >= 90) trendVsTeam = 'matching';
  else trendVsTeam = 'underperforming';
  
  // Calculate improvement potential
  const maxPossibleScore = 100;
  const currentScore = base.employeeScore || 0;
  const improvementPotential = maxPossibleScore > currentScore 
    ? Math.round(((maxPossibleScore - currentScore) / maxPossibleScore) * 100)
    : 0;
  
  // Generate improvement opportunity text
  let improvementOpportunity = '';
  if (trendVsTeam === 'underperforming') {
    if (scoreAchievementRate < revenueAchievementRate) {
      improvementOpportunity = 'Focus on activity quality and consistency';
    } else {
      improvementOpportunity = 'Focus on revenue generation and closing deals';
    }
  } else if (trendVsTeam === 'matching') {
    improvementOpportunity = 'Opportunity to become a top performer';
  } else {
    improvementOpportunity = 'Maintain excellent performance and mentor others';
  }
  
  // Create computed display name
  const displayName = employeeDisplayName;

  return {
    ...base,
    
    // Computed display fields
    displayName,
    employeeDisplayName,
    teamDisplayName,
    managerDisplayName,
    performancePercentile,
    rankingSuffix,
    
    // Computed comparison metrics
    aboveTeamAverage,
    aboveDepartmentAverage,
    performanceGap,
    revenueGap,
    improvementOpportunity,
    
    // Computed performance indicators
    isTopQuartile,
    isBottomQuartile,
    performanceCategory,
    
    // Computed achievement metrics
    scoreAchievementRate,
    revenueAchievementRate,
    overallAchievementRate,
    
    // Computed trend vs team
    trendVsTeam,
    improvementPotential
  };
}

/**
 * Calculate trend indicator from current and previous values
 */
export function calculateTrendIndicator(
  current: number,
  previous: number,
  metricType: 'revenue' | 'activity_score' | 'conversion_rate' = 'revenue'
): TrendIndicator {
  return calculateCustomerPerformanceTrend(current, previous, metricType);
}

/**
 * Helper function to generate ranking suffix
 */
export function generateRankingSuffix(rank: number): string {
  if (rank % 10 === 1 && rank % 100 !== 11) return `${rank}st`;
  if (rank % 10 === 2 && rank % 100 !== 12) return `${rank}nd`;
  if (rank % 10 === 3 && rank % 100 !== 13) return `${rank}rd`;
  return `${rank}th`;
}

/**
 * Helper function to determine performance level from multiple metrics
 */
export function calculateOverallPerformanceLevel(
  revenueAchievement: number,
  activityScore: number,
  conversionRate: number
): 'excellent' | 'good' | 'average' | 'poor' {
  const weightedScore = (revenueAchievement * 0.4) + (activityScore * 0.3) + (conversionRate * 0.3);
  
  if (weightedScore >= 85) return 'excellent';
  if (weightedScore >= 70) return 'good';
  if (weightedScore >= 50) return 'average';
  return 'poor';
}
