import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useTaskPerformanceAnalytics } from '../../../../hooks/useManagerAnalytics';
import { useEmployeeNamesBatch } from '../../../../hooks/useEmployeeNamesBatch';
import { TimeframeSelector, LoadingSpinner } from './shared';
import { EmployeeDisplayName } from '../EmployeeDisplayName';

/**
 * Task Performance Dashboard - Detailed task completion and performance metrics
 */
export interface TaskPerformanceDashboardProps extends BusinessAppContextProps {}

export const TaskPerformanceDashboard: React.FC<TaskPerformanceDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('wtd');

  const { data, isLoading, error } = useTaskPerformanceAnalytics({
    accessToken,
    userInfo,
    params: { timeframe },
  });

  // Extract user IDs for batch employee name resolution
  const userIds = data?.data?.userProductivity?.map(user => user.userId) || [];
  
  // Batch fetch employee names
  const { displayNames, isLoading: isLoadingNames } = useEmployeeNamesBatch({
    userIds,
    accessToken,
    enabled: userIds.length > 0,
  });

  if (isLoading || isLoadingNames) {
    return <LoadingSpinner message="Loading task performance data..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-red-600">
            <p>{getTranslationFromI18nKeyAndLabel('services.analytics.error.taskPerformance', 'Error loading ticket performance data')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug logging to see actual data structure
  console.log('[TaskPerformanceDashboard] Debug - API Data:', data?.data);

  // Prepare data for charts using correct API structure
  const stepPerformanceData = data?.data?.taskTypePerformance?.map(step => ({
    name: step.taskType,
    duration: step.avgResponseTime,
    completionRate: step.completionRate,
    totalTasks: step.totalTasks,
    completedTasks: step.completedTasks,
  })) || [];

  const userPerformanceData = data?.data?.userProductivity?.slice(0, 10)?.map(user => {
    // Get resolved employee name or fall back to userId
    const employeeName = displayNames.get(user.userId) || user.userName || user.userId;
    const displayName = employeeName.length > 15 ? employeeName.substring(0, 15) + '...' : employeeName;
    
    return {
      name: displayName,
      fullName: employeeName, // Keep full name for tooltip
      userId: user.userId, // Keep userId for reference
      tasks: user.tasksCompleted,
      avgTime: user.avgCompletionTime,
      productivity: user.productivityScore,
    };
  }) || [];

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="gba:space-y-6" data-testid="task-performance-dashboard">
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.title', 'Ticket Performance Analytics')}
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.description', 'Detailed ticket completion metrics and performance analysis')}
          </p>
        </div>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Performance Overview Cards */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.totalTasks', 'Total Tickets')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold">
              {(data?.data?.pendingTasks || 0) + (data?.data?.overdueTasks || 0)}
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.inPeriod', 'In selected period')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.avgCompletionTime', 'Avg Completion Time')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-blue-600">
              {(data?.data?.taskTypePerformance?.[0]?.avgResponseTime || 0).toFixed(2)}h
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.perTask', 'Per ticket average')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.efficiencyScore', 'Efficiency Score')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-green-600">
              {(data?.data?.taskTypePerformance?.[0]?.completionRate || 0)}%
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.overallEfficiency', 'Overall team efficiency')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        {/* Step Performance Chart */}
        {stepPerformanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.performanceByStep', 'Performance by Step Type')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stepPerformanceData}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="duration" 
                    fill="#3b82f6" 
                    name="Avg Duration (h)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* User Performance Chart */}
        {userPerformanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.tasksByUser', 'Tickets Completed by User')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userPerformanceData}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      value,
                      name
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        const data = payload[0].payload;
                        return `${data.fullName} (${data.userId.substring(0, 8)}...)`;
                      }
                      return label;
                    }}
                  />
                  <Bar 
                    dataKey="tasks" 
                    fill="#10b981" 
                    name="Tasks Completed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step Performance Details */}
      {stepPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.stepDetails', 'Step Performance Details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              {stepPerformanceData.map((step, index) => (
                <div key={index} className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg">
                  <div className="gba:flex-1">
                    <h4 className="gba:font-medium gba:text-gray-900">{step.name}</h4>
                    <div className="gba:flex gba:items-center gba:space-x-4 gba:mt-1">
                      <span className="gba:text-sm gba:text-gray-500">
                        {step.duration.toFixed(3)}h avg response time
                      </span>
                      <span className="gba:text-sm gba:text-gray-500">
                        {step.completionRate}% completion rate
                      </span>
                      <span className="gba:text-sm gba:text-gray-500">
                        {step.completedTasks}/{step.totalTasks} tasks
                      </span>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <span className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                      step.completionRate >= 80 ? 'gba:bg-green-100 gba:text-green-800' :
                      step.completionRate >= 60 ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                      'gba:bg-red-100 gba:text-red-800'
                    }`}>
                      {step.completionRate >= 80 ? 'Good' :
                       step.completionRate >= 60 ? 'Average' :
                       'Needs Attention'}
                    </span>
                  </div>
                </div>
              ))}
              {stepPerformanceData.length === 0 && (
                <p className="gba:text-center gba:text-gray-500 gba:py-4">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.noStepData', 'No step performance data available')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {userPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.topPerformers', 'Top Performers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              {(data?.data?.userProductivity || []).length > 0 ? (
                (data?.data?.userProductivity || [])
                  .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
                  .slice(0, 6)
                  .map((user, index) => (
                  <div key={user.userId} className="gba:p-4 gba:border gba:rounded-lg">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <div className="gba:font-medium gba:text-gray-900 gba:truncate">
                        <EmployeeDisplayName 
                          userId={user.userId}
                          accessToken={accessToken}
                          fallback={user.userName || 'Unknown User'}
                          testId={`task-performance-user-${index}`}
                        />
                      </div>
                      <span className={`gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 ${
                        index === 0 ? 'gba:text-yellow-500' : 
                        index === 1 ? 'gba:text-gray-400' : 
                        index === 2 ? 'gba:text-amber-600' : 
                        'gba:text-blue-500'
                      }`}>
                        {index === 0 ? <Trophy className="gba:w-5 gba:h-5" /> : 
                         index === 1 ? <Medal className="gba:w-5 gba:h-5" /> : 
                         index === 2 ? <Award className="gba:w-5 gba:h-5" /> : 
                         <Star className="gba:w-4 gba:h-4" />}
                      </span>
                    </div>
                    <div className="gba:space-y-1">
                      <p className="gba:text-sm gba:text-gray-600">
                        {user.tasksCompleted} tasks completed
                      </p>
                      <p className="gba:text-sm gba:text-gray-600">
                        {user.avgCompletionTime}h avg time
                      </p>
                      <span className={`gba:inline-block gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                        user.productivity > 1000 ? 'gba:bg-green-100 gba:text-green-800' :
                        user.productivity > 500 ? 'gba:bg-blue-100 gba:text-blue-800' :
                        user.productivity > 100 ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                        'gba:bg-red-100 gba:text-red-800'
                      }`}>
                        {user.productivity > 1000 ? 'Excellent' : 
                         user.productivity > 500 ? 'Good' : 
                         user.productivity > 100 ? 'Average' : 'Poor'}
                      </span>
                    </div>
                  </div>
                  ))
              ) : (
                <div className="gba:col-span-3 gba:text-center gba:py-8 gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.taskPerformance.noUserData', 'No user performance data available')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
