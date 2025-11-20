import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, ArrowRight, CheckCircle, Users } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useTrendAnalytics, useUsageAnalytics } from '../../../../hooks/useManagerAnalytics';
import { TimeframeSelector, LoadingSpinner, ErrorBoundary } from './shared';

/**
 * Trend Analytics Dashboard - Period comparisons and trend analysis
 */
export interface TrendAnalyticsDashboardProps extends BusinessAppContextProps {}

export const TrendAnalyticsDashboard: React.FC<TrendAnalyticsDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('wtd');

  const { data: trendData, isLoading: trendLoading, error: trendError } = useTrendAnalytics({
    accessToken,
    userInfo,
    params: { timeframe },
  });

  const { data: usageData, isLoading: usageLoading, error: usageError } = useUsageAnalytics({
    accessToken,
    userInfo,
    params: { timeframe, groupBy: 'department' },
  });

  if (trendLoading || usageLoading) {
    return <LoadingSpinner message="Loading trend analytics..." />;
  }

  if (trendError || usageError) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <p className="gba:mb-4">
              {getTranslationFromI18nKeyAndLabel(
                'services.analytics.error.title',
                'Error loading trend analytics'
              )}
            </p>
            <p className="gba:text-sm gba:text-gray-500">
              {trendError || usageError}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug logging to see actual data structure
  console.log('[TrendAnalyticsDashboard] Debug - Trend Data:', trendData?.data);
  console.log('[TrendAnalyticsDashboard] Debug - Usage Data:', usageData?.data);

  // Safe data extraction with fallbacks - using correct API response structure
  const currentFlows = trendData?.data?.current?.workflowsStarted || 0;
  const previousFlows = trendData?.data?.previous?.workflowsStarted || 0;
  const currentRate = trendData?.data?.current?.completionRate || 0;
  const previousRate = trendData?.data?.previous?.completionRate || 0;
  const trendDirection = trendData?.data?.trends?.workflowsStarted?.direction || 'stable';
  const totalUsers = usageData?.data?.userAdoption?.totalUsers || 0;
  const activeUsers = usageData?.data?.userAdoption?.activeUsers || 0;

  // Prepare safe comparison data
  const comparisonData = [
    {
      period: 'Previous',
      flows: previousFlows,
      completionRate: previousRate,
    },
    {
      period: 'Current',
      flows: currentFlows,
      completionRate: currentRate,
    },
  ];

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="gba:w-4 gba:h-4" />;
      case 'decreasing': return <TrendingDown className="gba:w-4 gba:h-4" />;
      default: return <ArrowRight className="gba:w-4 gba:h-4" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'gba:text-green-600';
      case 'decreasing': return 'gba:text-red-600';
      default: return 'gba:text-gray-600';
    }
  };

  return (
    <ErrorBoundary>
      <div className="gba:space-y-6" data-testid="trend-analytics-dashboard">
        {/* Header with Timeframe Selector */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('services.analytics.trends.title', 'Trends & Insights')}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('services.analytics.trends.description', 'Period comparisons, trend analysis, and forecasting insights')}
            </p>
          </div>
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>

        {/* Trend Overview Cards */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:space-x-2">
                <span>{getTrendIcon(trendDirection)}</span>
                <span>{getTranslationFromI18nKeyAndLabel('services.analytics.trends.flowsChange', 'Requests Trend')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                <div className="gba:text-2xl gba:font-bold">
                  {currentFlows}
                </div>
                <div className={`gba:text-sm gba:flex gba:items-center ${getTrendColor(trendDirection)}`}>
                  <span className="gba:mr-1">{getTrendIcon(trendDirection)}</span>
                  <span>
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.vs', 'vs')} {previousFlows} 
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.previous', ' (previous period)')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:space-x-2">
                <CheckCircle className="gba:w-5 gba:h-5" />
                <span>{getTranslationFromI18nKeyAndLabel('services.analytics.trends.completionRate', 'Completion Rate')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                <div className="gba:text-2xl gba:font-bold">
                  {currentRate}%
                </div>
                <div className="gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.trends.vs', 'vs')} {previousRate}%
                  {getTranslationFromI18nKeyAndLabel('services.analytics.trends.previous', ' (previous period)')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:space-x-2">
                <Users className="gba:w-5 gba:h-5" />
                <span>{getTranslationFromI18nKeyAndLabel('services.analytics.trends.userActivity', 'User Activity')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                <div className="gba:text-2xl gba:font-bold">
                  {activeUsers}
                </div>
                <div className="gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.trends.outOf', 'out of')} {totalUsers} 
                  {getTranslationFromI18nKeyAndLabel('services.analytics.trends.totalUsers', ' total users')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.trends.comparison', 'Period Comparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={comparisonData}>
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="flows" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                  name="Total Flows"
                />
                <Area 
                  type="monotone" 
                  dataKey="completionRate" 
                  stackId="2" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Completion Rate (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Analytics & Trend Insights */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          {/* Usage Analytics */}
          {usageData?.data?.departmentUsage && usageData.data.departmentUsage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.trends.usageByDepartment', 'Usage by Department')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  {usageData.data.departmentUsage.slice(0, 5).map((dept, index) => (
                    <div key={index} className="gba:flex gba:justify-between gba:items-center gba:p-3 gba:border gba:rounded-lg">
                      <div>
                        <div className="gba:font-medium">{dept.departmentName}</div>
                        <div className="gba:text-sm gba:text-gray-500">
                          {dept.workflowCount} {getTranslationFromI18nKeyAndLabel('services.analytics.trends.workflows', 'requests')}
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:font-bold">{dept.completionRate}%</div>
                        <div className="gba:text-sm gba:text-gray-500">
                          {getTranslationFromI18nKeyAndLabel('services.analytics.trends.completionRate', 'completion rate')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend Insights */}
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel('services.analytics.trends.insights', 'Trend Insights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-4">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.currentFlows', 'Current Period Requests')}
                  </span>
                  <span className="gba:font-bold">
                    {currentFlows}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.completedFlows', 'Completed Requests')}
                  </span>
                  <span className="gba:font-bold">
                    {trendData?.data?.current?.workflowsCompleted || 0}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.direction', 'Trend Direction')}
                  </span>
                  <span className={`gba:font-bold gba:flex gba:items-center ${getTrendColor(trendDirection)}`}>
                    <span className="gba:mr-1">{getTrendIcon(trendDirection)}</span>
                    {trendDirection}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel('services.analytics.trends.avgTasksPerUser', 'Avg Tickets Per User')}
                  </span>
                  <span className="gba:font-bold">
                    {trendData?.data?.current?.avgTasksPerUser || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};