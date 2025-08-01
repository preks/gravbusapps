import React, { useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, Alert, Button,
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { 
  BarChart3, Activity, Calendar, TrendingUp, Users, 
  AlertTriangle, Clock, CheckCircle, XCircle, 
  Target, Zap, Timer, TrendingDown
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { useFlowManagementAnalytics } from '../../hooks/useFlowAnalytics';

interface AnalyticsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  prefixDataTestId = 'analytics-tab',
  accessToken,
  ...context
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('qtd');
  
  const { 
    data: analytics, 
    isLoading, 
    error, 
    refetch 
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken
  });

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${prefixDataTestId}-loading`}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTriangle className="gba:h-4 gba:w-4" />
        <h3>Error Loading Flow Analytics</h3>
        <p>{error instanceof Error ? error.message : 'Failed to load flow management analytics'}</p>
        <Button onClick={refetch} variant="secondary" className="gba:mt-2">
          Retry
        </Button>
      </Alert>
    );
  }

  const statusMetrics = analytics?.statusMetrics;
  const slaKillers = analytics?.slaKillers || [];
  const longestCycleFlows = analytics?.longestCycleFlows || [];
  const longestCycleTasks = analytics?.longestCycleTasks || [];
  const timeSeries = analytics?.timeSeries || [];

  // Helper function to format large cycle hours
  const formatCycleTime = (hours: number): string => {
    if (hours > 8760) { // More than a year
      return `${Math.round(hours / 8760)} years`;
    } else if (hours > 168) { // More than a week
      return `${Math.round(hours / 168)} weeks`;
    } else if (hours > 24) { // More than a day
      return `${Math.round(hours / 24)} days`;
    } else {
      return `${Math.round(hours)} hours`;
    }
  };

  // Core Status Metrics Widgets
  const statusWidgets: WidgetItem[] = [
    {
      key: 'pending-vs-completed-flows',
      title: 'Pending Flows',
      value: statusMetrics?.pending_workflows || 0,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#f59e0b',
      description: `${statusMetrics?.total_workflows || 0} total flows`
    },
    {
      key: 'completed-flows',
      title: 'Completed Flows',
      value: statusMetrics?.completed_workflows || 0,
      prefix: <CheckCircle className="gba:h-4 gba:w-4" />,
      color: '#10b981',
      description: `${statusMetrics?.workflow_completion_rate || 0}% completion rate`
    },
    {
      key: 'pending-tasks',
      title: 'Pending Tasks',
      value: statusMetrics?.pending_tasks || 0,
      prefix: <Timer className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      description: 'Currently active tasks'
    },
    {
      key: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: statusMetrics?.overdue_tasks || 0,
      prefix: <AlertTriangle className="gba:h-4 gba:w-4" />,
      color: '#ef4444',
      description: 'Tasks exceeding due date'
    }
  ];

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Flow Management Analytics</h2>
          <p className="gba:text-gray-600">Actionable flow insights and performance metrics</p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
            data-testid={`${prefixDataTestId}-timeframe-selector`}
          >
            <option value="wtd">Week to Date</option>
            <option value="mtd">Month to Date</option>
            <option value="qtd">Quarter to Date</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
      </div>

      {/* Status Metrics - Top Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Activity className="gba:h-5 gba:w-5 gba:text-blue-600" />
            Workflow Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WidgetGroup
            widgets={statusWidgets}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            skeletonCount={4}
            emptyText="No status data available"
            data-testid={`${prefixDataTestId}-status-widgets`}
          />
        </CardContent>
      </Card>

      {/* Performance Insights Tabs */}
      <Tabs defaultValue="sla-killers" className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger value="sla-killers" className="gba:flex gba:items-center gba:gap-2">
            <AlertTriangle className="gba:h-4 gba:w-4" />
            SLA Killers
          </TabsTrigger>
          <TabsTrigger value="cycle-flows" className="gba:flex gba:items-center gba:gap-2">
            <TrendingDown className="gba:h-4 gba:w-4" />
            Longest Cycle Flows
          </TabsTrigger>
          <TabsTrigger value="cycle-tasks" className="gba:flex gba:items-center gba:gap-2">
            <Timer className="gba:h-4 gba:w-4" />
            Longest Cycle Tasks
          </TabsTrigger>
        </TabsList>

        {/* SLA Killers Tab */}
        <TabsContent value="sla-killers">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <AlertTriangle className="gba:h-5 gba:w-5 gba:text-red-600" />
                Top 3 SLA Killers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slaKillers.length > 0 ? (
                <div className="gba:space-y-4">
                  {slaKillers.map((killer, index) => (
                    <div key={index} className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:border-red-200 gba:bg-red-50">
                      <div>
                        <div className="gba:font-medium gba:text-gray-900">{killer.step_name}</div>
                        <div className="gba:text-sm gba:text-gray-600">{killer.flow_name}</div>
                        <div className="gba:text-xs gba:text-gray-500">{killer.total_tasks} total tasks</div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-lg gba:font-semibold gba:text-red-600">{killer.violation_rate}%</div>
                        <div className="gba:text-xs gba:text-red-700">{killer.sla_violations} violations</div>
                        <div className="gba:text-xs gba:text-gray-500">avg {killer.avg_overdue_hours}h overdue</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:text-center gba:text-gray-500 gba:py-8">
                  <Target className="gba:h-12 gba:w-12 gba:mx-auto gba:text-green-400 gba:mb-2" />
                  No SLA violations found - Great job! 🎯
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Longest Cycle Flows Tab */}
        <TabsContent value="cycle-flows">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <TrendingDown className="gba:h-5 gba:w-5 gba:text-orange-600" />
                Longest Cycle Time Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              {longestCycleFlows.length > 0 ? (
                <div className="gba:space-y-4">
                  {longestCycleFlows.map((flow, index) => (
                    <div key={index} className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:border-orange-200 gba:bg-orange-50">
                      <div>
                        <div className="gba:font-medium gba:text-gray-900">{flow.flow_name}</div>
                        <div className="gba:text-sm gba:text-gray-600">{flow.workflow_count} flows</div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-lg gba:font-semibold gba:text-orange-600">{formatCycleTime(flow.avg_cycle_hours)}</div>
                        <div className="gba:text-xs gba:text-orange-700">avg cycle</div>
                        <div className="gba:text-xs gba:text-gray-500">max: {formatCycleTime(flow.max_cycle_hours)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:text-center gba:text-gray-500 gba:py-8">
                  No cycle time data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Longest Cycle Tasks Tab */}
        <TabsContent value="cycle-tasks">
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Timer className="gba:h-5 gba:w-5 gba:text-yellow-600" />
                Longest Cycle Time Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {longestCycleTasks.length > 0 ? (
                <div className="gba:space-y-4">
                  {longestCycleTasks.map((task, index) => (
                    <div key={index} className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:border-yellow-200 gba:bg-yellow-50">
                      <div>
                        <div className="gba:font-medium gba:text-gray-900">{task.task_name}</div>
                        <div className="gba:text-sm gba:text-gray-600">{task.flow_name}</div>
                        <div className="gba:text-xs gba:text-gray-500">{task.task_count} executions</div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-lg gba:font-semibold gba:text-yellow-600">{formatCycleTime(task.avg_cycle_hours)}</div>
                        <div className="gba:text-xs gba:text-yellow-700">avg cycle</div>
                        <div className="gba:text-xs gba:text-gray-500">max: {formatCycleTime(task.max_cycle_hours)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:text-center gba:text-gray-500 gba:py-8">
                  No task cycle time data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Daily Performance Trends Charts - Below Tabs */}
      <div className="gba:space-y-6 lg:gba:space-y-0 lg:gba:grid lg:gba:grid-cols-2 lg:gba:gap-6 gba:mt-8">
        {/* Flow Performance Chart */}
        <Card className="gba:flex-1">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Activity className="gba:h-5 gba:w-5" style={{ color: 'hsl(220, 91%, 45%)' }} />
              Flow Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeries.length > 0 ? (
              <ChartContainer
                config={{
                  workflows_started: {
                    label: 'Started',
                    color: 'hsl(220, 91%, 70%)',
                  },
                  workflows_completed: {
                    label: 'Completed', 
                    color: 'hsl(220, 91%, 45%)',
                  },
                }}
                className="gba:h-[300px]"
              >
                <BarChart data={timeSeries.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <Bar dataKey="workflows_started" fill="hsl(220, 91%, 70%)" name="Started" />
                  <Bar dataKey="workflows_completed" fill="hsl(220, 91%, 45%)" name="Completed" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-8">
                No flow trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Performance Chart */}
        <Card className="gba:flex-1">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <CheckCircle className="gba:h-5 gba:w-5" style={{ color: 'hsl(214, 95%, 48%)' }} />
              Task Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeries.length > 0 ? (
              <ChartContainer
                config={{
                  tasks_started: {
                    label: 'Started',
                    color: 'hsl(214, 95%, 72%)',
                  },
                  tasks_completed: {
                    label: 'Completed',
                    color: 'hsl(214, 95%, 48%)',
                  },
                }}
                className="gba:h-[300px]"
              >
                <BarChart data={timeSeries.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <Bar dataKey="tasks_started" fill="hsl(214, 95%, 72%)" name="Started" />
                  <Bar dataKey="tasks_completed" fill="hsl(214, 95%, 48%)" name="Completed" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:py-8">
                No task trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};