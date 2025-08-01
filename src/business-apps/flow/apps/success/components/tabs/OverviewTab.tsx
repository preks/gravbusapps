import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Alert } from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { TrendingUp, Target, Clock, Users, Award } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { useFlowAnalytics } from '../../hooks/useFlowAnalytics';

interface OverviewTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  prefixDataTestId = 'flow-success-overview',
  accessToken,
  ...context
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd');
  
  const { 
    data: analytics, 
    isLoading, 
    error, 
    refetch 
  } = useFlowAnalytics({
    timeframe,
    includeBusinessMetrics: true,
    includeOperationalMetrics: false,
    accessToken
  });

  const businessKpis = analytics?.businessKpis;
  const userMetrics = analytics?.userMetrics;

  // Helper function to format cycle time
  const formatCycleTime = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return {
        value: minutes,
        suffix: minutes === 1 ? 'min' : 'min',
        precision: 0
      };
    } else {
      return {
        value: hours,
        suffix: 'h',
        precision: 1
      };
    }
  };

  // Prepare metrics data for WidgetGroup (without trend for now to fix layout)
  const avgCycleTimeHours = businessKpis?.avgCycleTime || 0;
  const formattedCycleTime = formatCycleTime(avgCycleTimeHours);

  const kpiWidgets: WidgetItem[] = [
    {
      key: 'total-workflows',
      title: 'Total Workflows',
      value: businessKpis?.totalWorkflows || 0,
      prefix: <Target className="gba:h-5 gba:w-5" />,
      color: '#3b82f6',
      description: 'Workflows initiated this time period'
    },
    {
      key: 'completion-rate',
      title: 'Completion Rate',
      value: businessKpis?.completionRate || 0,
      suffix: '%',
      precision: 1,
      prefix: <Award className="gba:h-5 gba:w-5" />,
      color: '#10b981',
      description: 'Successfully completed flows'
    },
    {
      key: 'avg-cycle-time',
      title: 'Avg Cycle Time',
      value: formattedCycleTime.value,
      suffix: formattedCycleTime.suffix,
      precision: formattedCycleTime.precision,
      prefix: <Clock className="gba:h-5 gba:w-5" />,
      color: '#f59e0b',
      description: 'Average completion time'
    },
    {
      key: 'sla-adherence',
      title: 'SLA Adherence',
      value: businessKpis?.slaAdherence || 0,
      suffix: '%',
      precision: 1,
      prefix: <TrendingUp className="gba:h-5 gba:w-5" />,
      color: '#8b5cf6',
      description: 'On-time delivery rate'
    },
    {
      key: 'active-users',
      title: 'Active Users',
      value: userMetrics?.activeUsers || 0,
      prefix: <Users className="gba:h-5 gba:w-5" />,
      color: '#ef4444',
      description: 'Users actively participating'
    },
    {
      key: 'avg-tasks-per-user',
      title: 'Avg Tasks per User',
      value: userMetrics?.avgTasksPerUser || 0,
      precision: 1,
      prefix: <TrendingUp className="gba:h-5 gba:w-5" />,
      color: '#06b6d4',
      description: 'Average tasks per user'
    }
  ];

  if (error) {
    return (
      <div className="gba:space-y-6" data-testid={prefixDataTestId}>
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Error Loading Dashboard Data</h4>
            <p className="gba:text-sm gba:mt-1">
              {error instanceof Error ? error.message : 'Failed to load analytics data'}
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Business Overview</h2>
          <p className="gba:text-gray-600">Key performance indicators and business outcomes</p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="gba:flex gba:bg-white gba:rounded-lg gba:border gba:p-1">
          {[
            { key: 'wtd', label: 'Week' },
            { key: 'mtd', label: 'Month' },
            { key: 'qtd', label: 'Quarter' },
            { key: 'ytd', label: 'Year' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeframe(key as any)}
              className={`gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-colors ${
                timeframe === key 
                  ? 'gba:bg-blue-100 gba:text-blue-700' 
                  : 'gba:text-gray-500 hover:gba:text-gray-700'
              }`}
              data-testid={`${prefixDataTestId}-timeframe-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <WidgetGroup
        widgets={kpiWidgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={6}
        emptyText="No KPI data available"
        data-testid={`${prefixDataTestId}-kpi-cards`}
      />

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:space-y-2">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:animate-pulse" />
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-5/6" />
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-4/6" />
            </div>
          ) : (
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full" />
                <span className="gba:text-sm gba:text-gray-700">
                  <strong>{businessKpis?.totalWorkflows || 0}</strong> workflows initiated with a <strong>{(businessKpis?.completionRate || 0).toFixed(1)}%</strong> completion rate
                </span>
              </div>
              
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full" />
                <span className="gba:text-sm gba:text-gray-700">
                  Average cycle time of <strong>
                    {avgCycleTimeHours < 1 
                      ? `${Math.round(avgCycleTimeHours * 60)} minutes`
                      : `${avgCycleTimeHours.toFixed(1)} hours`
                    }
                  </strong> with <strong>{(businessKpis?.slaAdherence || 0).toFixed(1)}%</strong> SLA adherence
                </span>
              </div>
              
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full" />
                <span className="gba:text-sm gba:text-gray-700">
                  <strong>{userMetrics?.activeUsers || 0}</strong> active users with an average of <strong>{(userMetrics?.avgTasksPerUser || 0).toFixed(1)}</strong> tasks per user
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 