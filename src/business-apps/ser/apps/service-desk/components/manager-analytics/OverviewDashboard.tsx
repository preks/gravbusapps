import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart3, CheckCircle, Clock, ClipboardList } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useManagerDashboard } from '../../../../hooks/useManagerAnalytics';
import { KPICard, TimeframeSelector, QuickInsights, LoadingSpinner, ErrorBoundary } from './shared';

/**
 * Overview Dashboard - Main manager analytics dashboard showing key metrics and insights
 */
export interface OverviewDashboardProps extends BusinessAppContextProps {}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('wtd');
  
  console.log('[OverviewDashboard] Component mounted/rendering');
  
  const {
    flowAnalytics,
    taskPerformance,
    flowManagement,
    trends,
    isLoading,
    hasError,
    refetchAll,
  } = useManagerDashboard({
    accessToken,
    userInfo,
    timeframe,
  });
  
  console.log('[OverviewDashboard] useManagerDashboard hook called with timeframe:', timeframe);


  if (isLoading) {
    return <LoadingSpinner message="Loading analytics data..." />;
  }

  if (hasError) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <p className="gba:mb-4">
              {getTranslationFromI18nKeyAndLabel(
                'services.analytics.error.title',
                'Error loading analytics data'
              )}
            </p>
            <button
              onClick={refetchAll}
              className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded-md hover:gba:bg-blue-700"
            >
              {getTranslationFromI18nKeyAndLabel('services.analytics.retry', 'Retry')}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <div className="gba:space-y-6" data-testid="overview-dashboard">
        {/* Header with Timeframe Selector */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('services.analytics.overview.title', 'Overview')}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('services.analytics.overview.description', 'Executive summary with key performance indicators and operational metrics')}
            </p>
          </div>
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>

        {/* KPI Cards Grid */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <KPICard
          title={getTranslationFromI18nKeyAndLabel('services.analytics.kpi.totalFlows', 'Total Requests')}
          value={flowAnalytics.data?.data?.businessKpis?.totalWorkflows || 0}
          trend={trends.data?.data?.trends?.workflowsStarted?.percentage || 0}
          trendDirection={trends.data?.data?.trends?.workflowsStarted?.direction || 'stable'}
          isLoading={flowAnalytics.isLoading}
          icon={<BarChart3 className="gba:w-5 gba:h-5" />}
        />
        <KPICard
          title={getTranslationFromI18nKeyAndLabel('services.analytics.kpi.completionRate', 'Completion Rate')}
          value={`${flowAnalytics.data?.data?.businessKpis?.completionRate || 0}%`}
          trend={trends.data?.data?.trends?.completionRate?.percentage || 0}
          trendDirection={trends.data?.data?.trends?.completionRate?.direction || 'stable'}
          isLoading={flowAnalytics.isLoading}
          icon={<CheckCircle className="gba:w-5 gba:h-5" />}
        />
        <KPICard
          title={getTranslationFromI18nKeyAndLabel('services.analytics.kpi.avgCompletionTime', 'Avg Completion Time')}
          value={`${flowAnalytics.data?.data?.businessKpis?.avgCycleTime || 0}h`}
          trend={trends.data?.data?.trends?.avgCycleTime?.percentage || 0}
          trendDirection={trends.data?.data?.trends?.avgCycleTime?.direction || 'stable'}
          isLoading={flowAnalytics.isLoading}
          icon={<Clock className="gba:w-5 gba:h-5" />}
        />
        <KPICard
          title={getTranslationFromI18nKeyAndLabel('services.analytics.kpi.activeTasks', 'Active Tickets')}
          value={(taskPerformance.data?.data?.pendingTasks || 0) + (taskPerformance.data?.data?.overdueTasks || 0)}
          trend={0}
          trendDirection="stable"
          isLoading={taskPerformance.isLoading}
          icon={<ClipboardList className="gba:w-5 gba:h-5" />}
        />
      </div>

      {/* Quick Insights & System Health */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
        {/* Quick Insights */}
        <QuickInsights 
          flowData={flowAnalytics.data}
          taskData={taskPerformance.data}
          managementData={flowManagement.data}
          isLoading={flowAnalytics.isLoading || taskPerformance.isLoading || flowManagement.isLoading}
        />

        {/* System Health */}
        <div className="gba:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.systemHealth.title', 'System Health')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.analytics.systemHealth.description',
                'Current system performance and operational status'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.efficiency', 'Request Efficiency')}
                </span>
                <span className="gba:text-lg gba:font-semibold gba:text-green-600">
                  {flowManagement.data?.data?.statusMetrics?.workflow_completion_rate || 0}%
                </span>
              </div>
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.activeFlows', 'Active Requests')}
                </span>
                <span className="gba:text-lg gba:font-semibold">
                  {flowManagement.data?.data?.statusMetrics?.pending_workflows || 0}
                </span>
              </div>
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.bottlenecks', 'Current Bottlenecks')}
                </span>
                <span className="gba:text-lg gba:font-semibold gba:text-orange-600">
                  {flowAnalytics.data?.data?.performanceMetrics?.bottlenecks?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.recommendations.title', 'Top Recommendations')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.analytics.recommendations.description',
                'AI-powered insights to improve request efficiency'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {flowManagement.data?.data?.bottleneckAnalysis?.recommendations?.slice(0, 3).map((rec, index) => (
                <div key={index} className="gba:flex gba:items-start gba:space-x-3">
                  <div className={`gba:w-2 gba:h-2 gba:rounded-full gba:mt-2 ${
                    rec.priority === 'high' ? 'gba:bg-red-500' :
                    rec.priority === 'medium' ? 'gba:bg-yellow-500' :
                    'gba:bg-green-500'
                  }`} />
                  <div className="gba:flex-1">
                    <p className="gba:text-sm gba:text-gray-900">{rec.description}</p>
                    <p className="gba:text-xs gba:text-gray-500 gba:capitalize">
                      {rec.priority} priority • {rec.type}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="gba:text-sm gba:text-gray-500 gba:text-center gba:py-4">
                  {getTranslationFromI18nKeyAndLabel(
                    'services.analytics.noRecommendations',
                    'No recommendations available'
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};
