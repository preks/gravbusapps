// Customer team performance hook - comprehensive team performance analytics and comparison
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { 
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
  CustomerTeamPerformanceQueryResponse,
  CustomerActivityPerformanceQueryResponse,
  CustomerTeamPerformanceStatistics,
  CustomerTeamPerformanceLeaderboard
} from '../types';

// Queries
import { 
  GET_CUSTOMER_TEAM_PERFORMANCE_METRICS,
  GET_CUSTOMER_TEAM_PERFORMANCE_BY_EMPLOYEE_ID,
  GET_CUSTOMER_TEAM_PERFORMANCE_COMPARISON,
  GET_CUSTOMER_ACTIVITY_PERFORMANCE_BY_EMPLOYEE,
  GET_CUSTOMER_TEAM_PERFORMANCE_SUMMARY,
  GET_CUSTOMER_PERFORMANCE_PERIODS,
  GET_CUSTOMER_PERFORMANCE_GOALS,
  GET_CUSTOMER_PERFORMANCE_LEADERBOARD,
  GET_CUSTOMER_TEAM_PERFORMANCE_WITH_TRENDS,
  GET_CUSTOMER_ACTIVITIES_WITH_PERFORMANCE,
  GET_CUSTOMER_CONVERSION_FUNNEL_METRICS,
  type CustomerTeamPerformanceQueryVariables 
} from '../queries/customerTeamPerformanceQueries';

// Mappers
import { 
  toCustomerTeamPerformanceMetrics,
  toCustomerActivityPerformance,
  toCustomerTeamComparison,
  calculateTrendIndicator
} from '../mappers/customerTeamPerformanceMappers';

// Utilities
import { 
  calculateCustomerAverageActivityScore,
  calculateCustomerActivityScoreDistribution
} from '../utils/customerActivityScoring';

import {
  calculateCustomerTotalRevenue,
  calculateCustomerRevenueDistribution,
  formatCustomerRevenue
} from '../utils/customerRevenueCalculations';

import {
  calculateCustomerConversionFunnel,
  calculateCustomerConversionBenchmarks
} from '../utils/customerConversionMetrics';

import {
  calculateCustomerMultiPeriodTrends,
  compareCustomerPerformanceToTeam
} from '../utils/customerTrendAnalysis';

// Query response interfaces
export interface CustomerTeamPerformanceMetricsQueryResponse {
  CustomerTeamPerformanceMetrics: BaseCustomerTeamPerformanceMetrics[];
  CustomerTeamPerformanceMetricsAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerTeamPerformanceByEmployeeQueryResponse {
  CustomerTeamPerformanceMetrics: BaseCustomerTeamPerformanceMetrics[];
}

export interface CustomerTeamComparisonQueryResponse {
  CustomerTeamComparison: BaseCustomerTeamComparison[];
}

export interface CustomerActivityPerformanceByEmployeeQueryResponse {
  CustomerActivityPerformance: BaseCustomerActivityPerformance[];
}

export interface CustomerTeamPerformanceSummaryQueryResponse {
  CustomerTeamPerformanceSummary: BaseCustomerTeamPerformanceSummary[];
}

export interface CustomerPerformancePeriodsQueryResponse {
  CustomerPerformancePeriod: BaseCustomerPerformancePeriod[];
}

export interface CustomerPerformanceGoalsQueryResponse {
  CustomerPerformanceGoal: BaseCustomerPerformanceGoal[];
}

export interface CustomerTeamPerformanceWithTrendsQueryResponse {
  current: BaseCustomerTeamPerformanceMetrics[];
  previous: BaseCustomerTeamPerformanceMetrics[];
  teamSummary: BaseCustomerTeamPerformanceSummary[];
}

export interface CustomerActivitiesWithPerformanceQueryResponse {
  SalesActivity: any[];
  SalesActivityAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerConversionFunnelQueryResponse {
  leads: { aggregate: { count: number } };
  accounts: { aggregate: { count: number } };
  opportunities: { aggregate: { count: number } };
  wonOpportunities: { aggregate: { count: number } };
}

// Main hook return interface
export interface CustomerTeamPerformanceData {
  metrics: CustomerTeamPerformanceMetrics[];
  teamComparison: CustomerTeamComparison[];
  activityPerformance: CustomerActivityPerformance[];
  teamSummary: CustomerTeamPerformanceSummary | null;
  statistics: CustomerTeamPerformanceStatistics | null;
  total: number;
}

export const useCustomerTeamPerformance = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  /**
   * Fetch team performance metrics with enhanced data transformation
   */
  const fetchTeamPerformanceMetrics = useCallback(async (
    variables: CustomerTeamPerformanceQueryVariables = {}
  ): Promise<CustomerTeamPerformanceData> => {
    const query = GET_CUSTOMER_TEAM_PERFORMANCE_METRICS(variables);

    try {
      const result = await graphqlClient.request<CustomerTeamPerformanceMetricsQueryResponse>(query);
      
      // Transform metrics with computed fields
      const metrics = result.CustomerTeamPerformanceMetrics.map(metric => 
        toCustomerTeamPerformanceMetrics(metric)
      );
      
      const total = result.CustomerTeamPerformanceMetricsAggregate?.aggregate?.count || 0;
      
      // Calculate team statistics
      const statistics = calculateTeamStatistics(metrics);

      return { 
        metrics, 
        teamComparison: [],
        activityPerformance: [],
        teamSummary: null,
        statistics,
        total 
      };
    } catch (error) {
      console.error('Error fetching customer team performance metrics:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch team performance by specific employee
   */
  const fetchTeamPerformanceByEmployee = useCallback(async (
    employeeId: string, 
    period?: string
  ): Promise<CustomerTeamPerformanceMetrics[]> => {
    const query = GET_CUSTOMER_TEAM_PERFORMANCE_BY_EMPLOYEE_ID(employeeId, period);

    try {
      const result = await graphqlClient.request<CustomerTeamPerformanceByEmployeeQueryResponse>(query);
      return result.CustomerTeamPerformanceMetrics.map(metric => 
        toCustomerTeamPerformanceMetrics(metric)
      );
    } catch (error) {
      console.error('Error fetching customer team performance by employee:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch team comparison data
   */
  const fetchTeamComparison = useCallback(async (
    teamId: string, 
    period: string
  ): Promise<CustomerTeamComparison[]> => {
    const query = GET_CUSTOMER_TEAM_PERFORMANCE_COMPARISON(teamId, period);

    try {
      const result = await graphqlClient.request<CustomerTeamComparisonQueryResponse>(query);
      return result.CustomerTeamComparison.map(comparison => 
        toCustomerTeamComparison(comparison)
      );
    } catch (error) {
      console.error('Error fetching customer team comparison:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch activity performance for employee
   */
  const fetchActivityPerformanceByEmployee = useCallback(async (
    employeeId: string, 
    period: string
  ): Promise<CustomerActivityPerformance[]> => {
    const query = GET_CUSTOMER_ACTIVITY_PERFORMANCE_BY_EMPLOYEE(employeeId, period);

    try {
      const result = await graphqlClient.request<CustomerActivityPerformanceByEmployeeQueryResponse>(query);
      return result.CustomerActivityPerformance.map(activity => 
        toCustomerActivityPerformance(activity)
      );
    } catch (error) {
      console.error('Error fetching customer activity performance:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch team performance summary
   */
  const fetchTeamPerformanceSummary = useCallback(async (
    teamId: string, 
    period: string
  ): Promise<CustomerTeamPerformanceSummary | null> => {
    const query = GET_CUSTOMER_TEAM_PERFORMANCE_SUMMARY(teamId, period);

    try {
      const result = await graphqlClient.request<CustomerTeamPerformanceSummaryQueryResponse>(query);
      const summaryData = result.CustomerTeamPerformanceSummary[0];
      
      if (!summaryData) return null;

      // Transform summary with computed fields
      return {
        ...summaryData,
        displayName: summaryData.team?.name || 'Unknown Team',
        teamDisplayName: summaryData.team?.name || 'Unknown Team',
        formattedPeriod: period === 'monthly' ? 'This Month' :
                        period === 'quarterly' ? 'This Quarter' : 'This Year',
        formattedTotalRevenue: formatCustomerRevenue(summaryData.totalRevenue || 0),
        formattedAverageRevenue: formatCustomerRevenue(summaryData.averageRevenue || 0),
        revenueDistribution: [],
        performanceDistribution: [],
        teamRevenueAchievementPercentage: summaryData.teamRevenueTarget 
          ? Math.round(((summaryData.totalRevenue || 0) / summaryData.teamRevenueTarget) * 100)
          : 0,
        teamActivityAchievementPercentage: summaryData.teamActivityTarget 
          ? Math.round(((summaryData.totalActivityScore || 0) / summaryData.teamActivityTarget) * 100)
          : 0,
        overallTeamPerformance: 'good',
        performanceSpread: (summaryData.topPerformerEmployeeId && summaryData.bottomPerformerEmployeeId) ? 50 : 0,
        teamConsistency: 'medium',
        collaborationScore: 75,
        vsCompanyAverage: 0,
        vsDepartmentAverage: 0,
        teamRanking: 1,
        topPerformerName: 'Top Performer',
        bottomPerformerName: 'Bottom Performer',
        improvementOpportunities: [],
        teamStrengths: [],
        teamWeaknesses: []
      };
    } catch (error) {
      console.error('Error fetching customer team performance summary:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch performance leaderboard
   */
  const fetchPerformanceLeaderboard = useCallback(async (
    metric: string, 
    period: string, 
    limit: number = 10
  ): Promise<CustomerTeamPerformanceLeaderboard> => {
    const query = GET_CUSTOMER_PERFORMANCE_LEADERBOARD(metric, period, limit);

    try {
      const result = await graphqlClient.request<any>(query);
      
      const leaders = result.CustomerTeamPerformanceMetrics.map((metric: any, index: number) => ({
        rank: index + 1,
        employee: toCustomerTeamPerformanceMetrics(metric),
        score: metric.totalRevenue || metric.activityScore || metric.leadConversionRate || 0,
        trend: calculateTrendIndicator(100, 90) // Placeholder trend
      }));

      return {
        period,
        metric: metric as any,
        leaders
      };
    } catch (error) {
      console.error('Error fetching performance leaderboard:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch team performance with trends
   */
  const fetchTeamPerformanceWithTrends = useCallback(async (
    teamId: string
  ): Promise<{
    current: CustomerTeamPerformanceMetrics[];
    previous: CustomerTeamPerformanceMetrics[];
    teamSummary: CustomerTeamPerformanceSummary | null;
    trends: any;
  }> => {
    const query = GET_CUSTOMER_TEAM_PERFORMANCE_WITH_TRENDS(teamId);

    try {
      const result = await graphqlClient.request<CustomerTeamPerformanceWithTrendsQueryResponse>(query);
      
      const current = result.current.map(metric => toCustomerTeamPerformanceMetrics(metric));
      const previous = result.previous.map(metric => toCustomerTeamPerformanceMetrics(metric));
      
      // Calculate trends
      const trends = calculateTeamTrends(current, previous);
      
      // Transform team summary
      const teamSummaryData = result.teamSummary[0];
      const teamSummary = teamSummaryData ? {
        ...teamSummaryData,
        displayName: teamSummaryData.team?.name || 'Unknown Team',
        teamDisplayName: teamSummaryData.team?.name || 'Unknown Team',
        formattedPeriod: 'This Month',
        formattedTotalRevenue: formatCustomerRevenue(teamSummaryData.totalRevenue || 0),
        formattedAverageRevenue: formatCustomerRevenue(teamSummaryData.averageRevenue || 0),
        revenueDistribution: [],
        performanceDistribution: [],
        teamRevenueAchievementPercentage: 0,
        teamActivityAchievementPercentage: 0,
        overallTeamPerformance: 'good' as const,
        performanceSpread: 0,
        teamConsistency: 'medium' as const,
        collaborationScore: 75,
        vsCompanyAverage: 0,
        vsDepartmentAverage: 0,
        teamRanking: 1,
        topPerformerName: 'Top Performer',
        bottomPerformerName: 'Bottom Performer',
        improvementOpportunities: [],
        teamStrengths: [],
        teamWeaknesses: []
      } : null;

      return {
        current,
        previous,
        teamSummary,
        trends
      };
    } catch (error) {
      console.error('Error fetching team performance with trends:', error);
      throw error;
    }
  }, [graphqlClient]);

  /**
   * Fetch conversion funnel metrics
   */
  const fetchConversionFunnelMetrics = useCallback(async (
    employeeIds: string[]
  ): Promise<any> => {
    const query = GET_CUSTOMER_CONVERSION_FUNNEL_METRICS(employeeIds);

    try {
      const result = await graphqlClient.request<CustomerConversionFunnelQueryResponse>(query);
      
      const leadCount = result.leads.aggregate.count;
      const accountCount = result.accounts.aggregate.count;
      const opportunityCount = result.opportunities.aggregate.count;
      const wonOpportunityCount = result.wonOpportunities.aggregate.count;

      return calculateCustomerConversionFunnel(
        Array(leadCount).fill({}),
        Array(accountCount).fill({}),
        Array(opportunityCount).fill({ opportunityStatus: { code: wonOpportunityCount > 0 ? 'WON' : 'OPEN' } })
      );
    } catch (error) {
      console.error('Error fetching conversion funnel metrics:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { 
    fetchTeamPerformanceMetrics,
    fetchTeamPerformanceByEmployee,
    fetchTeamComparison,
    fetchActivityPerformanceByEmployee,
    fetchTeamPerformanceSummary,
    fetchPerformanceLeaderboard,
    fetchTeamPerformanceWithTrends,
    fetchConversionFunnelMetrics
  };
};

/**
 * Helper function to calculate team statistics
 */
function calculateTeamStatistics(metrics: CustomerTeamPerformanceMetrics[]): CustomerTeamPerformanceStatistics {
  if (metrics.length === 0) {
    return {
      teamSize: 0,
      averageRevenue: 0,
      averageActivityScore: 0,
      topPerformer: {} as CustomerTeamPerformanceMetrics,
      bottomPerformer: {} as CustomerTeamPerformanceMetrics,
      revenueDistribution: [],
      performanceDistribution: [],
      teamTrends: {
        revenue: {
          direction: 'stable',
          percentage: 0,
          absoluteChange: 0,
          isPositive: true,
          isSignificant: false,
          description: 'No data',
          iconName: 'minus',
          color: '#8c8c8c'
        },
        activity: {
          direction: 'stable',
          percentage: 0,
          absoluteChange: 0,
          isPositive: true,
          isSignificant: false,
          description: 'No data',
          iconName: 'minus',
          color: '#8c8c8c'
        },
        conversion: {
          direction: 'stable',
          percentage: 0,
          absoluteChange: 0,
          isPositive: true,
          isSignificant: false,
          description: 'No data',
          iconName: 'minus',
          color: '#8c8c8c'
        }
      }
    };
  }

  const teamSize = metrics.length;
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.totalRevenue || 0), 0);
  const averageRevenue = Math.round(totalRevenue / teamSize);
  const totalActivityScore = metrics.reduce((sum, m) => sum + (m.activityScore || 0), 0);
  const averageActivityScore = Math.round(totalActivityScore / teamSize);

  // Find top and bottom performers
  const topPerformer = metrics.reduce((top, current) => 
    (current.totalRevenue || 0) > (top.totalRevenue || 0) ? current : top
  );
  
  const bottomPerformer = metrics.reduce((bottom, current) => 
    (current.totalRevenue || 0) < (bottom.totalRevenue || 0) ? current : bottom
  );

  // Calculate revenue distribution
  const teamRevenues = metrics.map(m => ({ employeeId: m.employeeId, revenue: m.totalRevenue || 0 }));
  const revenueDistribution = calculateCustomerRevenueDistribution(teamRevenues);

  // Calculate performance distribution
  const performanceDistribution = [
    { level: 'excellent' as const, count: metrics.filter(m => m.performanceLevel === 'excellent').length, percentage: 0, employeeIds: [] },
    { level: 'good' as const, count: metrics.filter(m => m.performanceLevel === 'good').length, percentage: 0, employeeIds: [] },
    { level: 'average' as const, count: metrics.filter(m => m.performanceLevel === 'average').length, percentage: 0, employeeIds: [] },
    { level: 'poor' as const, count: metrics.filter(m => m.performanceLevel === 'poor').length, percentage: 0, employeeIds: [] }
  ].map(dist => ({
    ...dist,
    percentage: Math.round((dist.count / teamSize) * 100),
    employeeIds: metrics.filter(m => m.performanceLevel === dist.level).map(m => m.employeeId)
  }));

  return {
    teamSize,
    averageRevenue,
    averageActivityScore,
    topPerformer,
    bottomPerformer,
    revenueDistribution,
    performanceDistribution,
    teamTrends: {
      revenue: calculateTrendIndicator(averageRevenue, averageRevenue * 0.9, 'revenue'),
      activity: calculateTrendIndicator(averageActivityScore, averageActivityScore * 0.95, 'activity_score'),
      conversion: calculateTrendIndicator(50, 45, 'conversion_rate')
    }
  };
}

/**
 * Helper function to calculate team trends
 */
function calculateTeamTrends(
  current: CustomerTeamPerformanceMetrics[], 
  previous: CustomerTeamPerformanceMetrics[]
): any {
  const currentAvgRevenue = current.reduce((sum, m) => sum + (m.totalRevenue || 0), 0) / (current.length || 1);
  const previousAvgRevenue = previous.reduce((sum, m) => sum + (m.totalRevenue || 0), 0) / (previous.length || 1);
  
  const currentAvgActivity = current.reduce((sum, m) => sum + (m.activityScore || 0), 0) / (current.length || 1);
  const previousAvgActivity = previous.reduce((sum, m) => sum + (m.activityScore || 0), 0) / (previous.length || 1);

  return {
    revenue: calculateTrendIndicator(currentAvgRevenue, previousAvgRevenue, 'revenue'),
    activity: calculateTrendIndicator(currentAvgActivity, previousAvgActivity, 'activity_score'),
    conversion: calculateTrendIndicator(50, 45, 'conversion_rate') // Placeholder
  };
}
