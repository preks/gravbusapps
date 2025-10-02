import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useTaskPerformanceAnalytics, useAuditLogs } from '../../../../hooks/useManagerAnalytics';
import { useEmployeeNamesBatch } from '../../../../hooks/useEmployeeNamesBatch';
import { TimeframeSelector, LoadingSpinner, ErrorBoundary } from './shared';
import { EmployeeDisplayName } from '../EmployeeDisplayName';

/**
 * Employee Analytics Dashboard - Detailed view of individual employee performance metrics
 */
export interface EmployeeAnalyticsDashboardProps extends BusinessAppContextProps {}

export const EmployeeAnalyticsDashboard: React.FC<EmployeeAnalyticsDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('wtd');

  const { data: taskPerformanceData, isLoading: taskLoading, error: taskError } = useTaskPerformanceAnalytics({
    accessToken,
    userInfo,
    params: { timeframe },
  });

  const { data: auditData, isLoading: auditLoading } = useAuditLogs({
    accessToken,
    userInfo,
    params: { limit: 100 },
  });

  // Extract user IDs for batch employee name resolution
  const userIds = taskPerformanceData?.data?.userProductivity?.map(user => user.userId) || [];
  
  // Batch fetch employee names
  const { displayNames, isLoading: isLoadingNames } = useEmployeeNamesBatch({
    userIds,
    accessToken,
    enabled: userIds.length > 0,
  });

  // Debug logging to see actual data structure
  console.log('[EmployeeAnalyticsDashboard] Debug - Task Performance Data:', taskPerformanceData?.data);
  console.log('[EmployeeAnalyticsDashboard] Debug - Audit Data:', auditData?.data);

  if (taskLoading || isLoadingNames) {
    return <LoadingSpinner message="Loading employee analytics..." />;
  }

  if (taskError) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <p>{getTranslationFromI18nKeyAndLabel('services.analytics.error.employee', 'Error loading employee analytics')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEfficiencyBadgeColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'gba:bg-green-100 gba:text-green-800';
      case 'good': return 'gba:bg-blue-100 gba:text-blue-800';
      case 'average': return 'gba:bg-yellow-100 gba:text-yellow-800';
      case 'poor': return 'gba:bg-red-100 gba:text-red-800';
      default: return 'gba:bg-gray-100 gba:text-gray-800';
    }
  };

  // Calculate overdue tasks from audit data (simplified approach)
  const getOverdueTasksForUser = (userId: string): number => {
    if (!auditData?.data) return 0;
    
    // Check if auditData.data is an array, if not, try to find the logs array
    let logsArray = [];
    if (Array.isArray(auditData.data)) {
      logsArray = auditData.data;
    } else if (auditData.data?.logs && Array.isArray(auditData.data.logs)) {
      logsArray = auditData.data.logs;
    } else {
      // If no valid array found, return 0 (no overdue tasks)
      return 0;
    }
    
    // This is a simplified calculation - in real implementation, you'd have more sophisticated logic
    const userActions = logsArray.filter(entry => entry.userId === userId) || [];
    const pendingActions = userActions.filter(entry => entry.status === 'PENDING');
    return pendingActions.length;
  };

  return (
    <ErrorBoundary>
      <div className="gba:space-y-6" data-testid="employee-analytics-dashboard">
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('services.analytics.employee.title', 'Employee Performance Analytics')}
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('services.analytics.employee.description', 'Individual performance metrics and ticket completion analysis')}
          </p>
        </div>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Performance Overview Cards */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.teamEfficiency', 'Team Efficiency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-green-600">
              {taskPerformanceData?.data?.taskTypePerformance?.[0]?.completionRate || 0}%
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.overallTeam', 'Overall team performance')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.avgTasksPerDay', 'Avg Tickets/Day')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold">
              {(((taskPerformanceData?.data?.pendingTasks || 0) + (taskPerformanceData?.data?.overdueTasks || 0)) / 7).toFixed(1)}
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.basedOnMonth', 'Based on monthly average')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.avgCompletionTime', 'Avg Completion Time')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold">
              {(taskPerformanceData?.data?.taskTypePerformance?.[0]?.avgResponseTime || 0).toFixed(3)}h
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.perTask', 'Per ticket average')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('services.analytics.employee.performanceTable', 'Individual Employee Performance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.employee', 'Employee')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.tasksCompleted', 'Tickets Completed')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.avgTime', 'Avg Time')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.efficiency', 'Efficiency')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.overdueTasks', 'Overdue Tickets')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('services.analytics.employee.avgPerDay', 'Tickets/Day')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(taskPerformanceData?.data?.userProductivity || []).map((user) => {
                const overdueCount = getOverdueTasksForUser(user.userId);
                const tasksPerDay = (user.tasksCompleted / 7).toFixed(1);
                
                return (
                  <TableRow key={user.userId}>
                    <TableCell className="gba:font-medium">
                      <EmployeeDisplayName 
                        userId={user.userId}
                        accessToken={accessToken}
                        fallback={user.userName || 'Unknown User'}
                        testId={`employee-analytics-user-${user.userId}`}
                      />
                    </TableCell>
                    <TableCell>{user.tasksCompleted}</TableCell>
                    <TableCell>{user.avgCompletionTime || 0}h</TableCell>
                    <TableCell>
                      <Badge className={getEfficiencyBadgeColor(
                        user.productivityScore > 1000 ? 'excellent' : 
                        user.productivityScore > 500 ? 'good' : 
                        user.productivityScore > 100 ? 'average' : 'poor'
                      )}>
                        {user.productivityScore > 1000 ? 'excellent' : 
                         user.productivityScore > 500 ? 'good' : 
                         user.productivityScore > 100 ? 'average' : 'poor'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={overdueCount > 0 ? 'gba:text-orange-600 gba:font-semibold' : 'gba:text-gray-600'}>
                        {overdueCount}
                      </span>
                    </TableCell>
                    <TableCell>{tasksPerDay}</TableCell>
                  </TableRow>
                );
              }) || (
                <TableRow>
                  <TableCell colSpan={6} className="gba:text-center gba:py-8 gba:text-gray-500">
                    {getTranslationFromI18nKeyAndLabel('services.analytics.employee.noData', 'No employee performance data available')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance by Step Type */}
      {taskPerformanceData?.data?.performanceByStep && taskPerformanceData.data?.performanceByStep?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.employee.performanceByStep', 'Performance by Step Type')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              {taskPerformanceData.data?.performanceByStep?.map((step, index) => (
                <div key={index} className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg">
                  <div className="gba:flex-1">
                    <h4 className="gba:font-medium gba:text-gray-900">{step.stepType}</h4>
                    <p className="gba:text-sm gba:text-gray-500">
                      {step.avgDuration}h avg duration • {step.completionRate}% completion rate
                    </p>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Badge className={
                      step.bottleneckRisk === 'high' ? 'gba:bg-red-100 gba:text-red-800' :
                      step.bottleneckRisk === 'medium' ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                      'gba:bg-green-100 gba:text-green-800'
                    }>
                      {step.bottleneckRisk} risk
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </ErrorBoundary>
  );
};
