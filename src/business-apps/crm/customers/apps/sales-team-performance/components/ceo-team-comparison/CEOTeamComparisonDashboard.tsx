import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@newwork/nw-design-system';
import {
  PiTrendUp,
  PiTrendDown,
  PiUsers,
  PiTarget,
  PiCurrencyDollar,
  PiChartLine,
  PiRanking,
  PiArrowRight,
} from 'react-icons/pi';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatCurrency } from '@/business-apps/crm/common/utils/currencyUtils';
import { TeamInfo } from '../../types/userRoles';
import { useTeamPerformanceData } from '../../hooks/useTeamPerformanceData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';

const DATA_TEST_ID_PREFIX = 'CEOTeamComparison';

interface CEOTeamComparisonDashboardProps extends BusinessAppContextProps {
  availableTeams: TeamInfo[];
  onTeamSelect?: (teamId: string, teamName: string) => void;
}

type ComparisonMetric = 'revenue' | 'winRate' | 'activities' | 'pipeline' | 'efficiency';

export const CEOTeamComparisonDashboard: React.FC<CEOTeamComparisonDashboardProps> = ({
  availableTeams,
  onTeamSelect,
  accessToken,
}) => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>('revenue');

  // Initialize with first 3 teams selected
  useEffect(() => {
    if (availableTeams.length > 0 && selectedTeams.length === 0) {
      setSelectedTeams(availableTeams.slice(0, Math.min(3, availableTeams.length)).map(t => t.id));
    }
  }, [availableTeams, selectedTeams.length]);

  // Prepare selected teams data for the hook
  const selectedTeamsData = useMemo(() => {
    return selectedTeams.map(teamId => {
      const team = availableTeams.find(t => t.id === teamId);
      return team; // Return the full TeamInfo object since it now has memberIds
    }).filter(team => team && team.memberIds.length > 0) as TeamInfo[]; // Only include teams with members
  }, [selectedTeams, availableTeams]);

  // Fetch real team performance data
  const { teamsData, isLoading, error, refetch } = useTeamPerformanceData({
    accessToken,
    teams: selectedTeamsData,
  });



  // Handle team selection
  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams(prev => [...prev, teamId]);
    } else {
      setSelectedTeams(prev => prev.filter(id => id !== teamId));
    }
  };

  // Create company-wide KPI widgets
  const createCompanyKPIWidgets = (): WidgetItem[] => {
    if (teamsData.length === 0) return [];

    const totalRevenue = teamsData.reduce((sum, team) => sum + team.totalRevenue, 0);
    const avgWinRate = teamsData.reduce((sum, team) => sum + team.winRate, 0) / teamsData.length;
    const totalActivities = teamsData.reduce((sum, team) => sum + team.totalActivities, 0);
    const totalPipeline = teamsData.reduce((sum, team) => sum + team.pipelineValue, 0);
    
    // Get currency code from the first team (all teams should use same currency)
    const currencyCode = teamsData.length > 0 ? teamsData[0].currencyCode : 'EUR';

    return [
      {
        key: 'company-revenue',
        title: 'Total Company Revenue',
        value: formatCurrency(totalRevenue, currencyCode),
        prefix: <PiCurrencyDollar />,
        color: '#10b981',
        description: `Across ${teamsData.length} selected teams`,
        valueIsString: true,
      },
      {
        key: 'company-win-rate',
        title: 'Average Win Rate',
        value: Math.round(avgWinRate * 10) / 10, // Round to 1 decimal place
        prefix: <PiTarget />,
        color: '#1677ff',
        description: 'Company-wide average',
        precision: 1,
        suffix: '%',
      },
      {
        key: 'company-activities',
        title: 'Total Activities',
        value: totalActivities,
        prefix: <PiUsers />,
        color: '#722ed1',
        description: 'All team activities combined',
      },
      {
        key: 'company-pipeline',
        title: 'Total Pipeline Value',
        value: formatCurrency(totalPipeline, currencyCode),
        prefix: <PiChartLine />,
        color: '#ff9500',
        description: 'Company-wide pipeline',
        valueIsString: true,
      },
    ];
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return teamsData.map(team => ({
      name: team.teamName.length > 15 ? team.teamName.substring(0, 12) + '...' : team.teamName,
      fullName: team.teamName,
      revenue: team.totalRevenue / 1000, // Convert to thousands for better chart readability
      winRate: team.winRate,
      activities: team.totalActivities,
      pipeline: team.pipelineValue / 1000,
      efficiency: team.averageRevenuePerMember / 1000,
    }));
  }, [teamsData]);

  const getMetricLabel = (metric: ComparisonMetric): string => {
    switch (metric) {
      case 'revenue': return 'Revenue (K)';
      case 'winRate': return 'Win Rate (%)';
      case 'activities': return 'Activities';
      case 'pipeline': return 'Pipeline (K)';
      case 'efficiency': return 'Revenue per Member (K)';
      default: return 'Revenue (K)';
    }
  };

  const getMetricColor = (metric: ComparisonMetric): string => {
    switch (metric) {
      case 'revenue': return '#10b981';
      case 'winRate': return '#1677ff';
      case 'activities': return '#722ed1';
      case 'pipeline': return '#ff9500';
      case 'efficiency': return '#f59e0b';
      default: return '#10b981';
    }
  };

  // Enhanced activities chart data
  const activitiesChartData = useMemo(() => {
    if (comparisonMetric !== 'activities') return [];
    
    return teamsData.map(team => ({
      name: team.teamName.length > 12 ? team.teamName.substring(0, 10) + '...' : team.teamName,
      fullName: team.teamName,
      totalActivities: team.totalActivities,
      activitiesPerMember: Math.round(team.totalActivities / Math.max(team.memberCount, 1)),
      // Mock activity type breakdown (in real app, fetch from API)
      calls: Math.round(team.totalActivities * 0.4),
      emails: Math.round(team.totalActivities * 0.3),
      meetings: Math.round(team.totalActivities * 0.2),
      tasks: Math.round(team.totalActivities * 0.1),
      efficiency: Math.round((team.totalRevenue / Math.max(team.totalActivities, 1)) / 1000), // Revenue per activity (K)
    }));
  }, [teamsData, comparisonMetric]);

  // Activity type breakdown data for pie chart
  const activityTypeData = useMemo(() => {
    if (comparisonMetric !== 'activities' || activitiesChartData.length === 0) return [];
    
    const totals = activitiesChartData.reduce((acc, team) => ({
      calls: acc.calls + team.calls,
      emails: acc.emails + team.emails,
      meetings: acc.meetings + team.meetings,
      tasks: acc.tasks + team.tasks,
    }), { calls: 0, emails: 0, meetings: 0, tasks: 0 });

    return [
      { name: 'Calls', value: totals.calls, color: '#10b981' },
      { name: 'Emails', value: totals.emails, color: '#1677ff' },
      { name: 'Meetings', value: totals.meetings, color: '#f59e0b' },
      { name: 'Tasks', value: totals.tasks, color: '#ef4444' },
    ];
  }, [activitiesChartData, comparisonMetric]);



  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:font-medium">Error Loading Team Performance Data</div>
              <div className="gba:text-sm gba:mt-1">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gba:ml-2"
              data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
            >
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  console.log('CEO Dashboard render states:', {
    isLoading,
    teamsDataCount: teamsData.length,
    selectedTeamsCount: selectedTeams.length,
    teamsDataSample: teamsData.length > 0 ? {
      firstTeam: {
        name: teamsData[0].teamName,
        revenue: teamsData[0].totalRevenue,
        activities: teamsData[0].totalActivities,
        memberCount: teamsData[0].memberCount,
        winRate: teamsData[0].winRate
      }
    } : null,
    selectedTeamsDataCount: selectedTeamsData.length
  });

  return (
    <div
      className="gba:bg-white gba:min-h-screen gba:p-6 gba:space-y-6"
      data-testid={DATA_TEST_ID_PREFIX}
    >

      {/* Header Section */}
      <div 
        className="gba:bg-gradient-to-r gba:from-purple-50 gba:to-indigo-50 gba:rounded-lg gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-header`}
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">
              Cross-Team Performance Analysis
            </h1>
            <p className="gba:text-gray-600">
              Compare performance across sales teams and identify strategic opportunities
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2 gba:text-sm gba:text-gray-500">
            <PiRanking className="gba:w-4 gba:h-4" />
            <span>{selectedTeams.length} Teams Selected</span>
          </div>
        </div>
      </div>

      {/* Company Overview KPIs - Moved Above */}
      <div 
        className="gba:mb-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}
      >
        <WidgetGroup
          widgets={createCompanyKPIWidgets()}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={() => refetch()}
          skeletonCount={4}
          emptyText="Select teams to see company performance statistics."
          data-testid={`${DATA_TEST_ID_PREFIX}-kpi-widgets`}
        />
      </div>

      {/* Team Selection & Controls */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
        {/* Team Selection */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-team-selection`}>
          <CardHeader>
            <CardTitle>Select Teams to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3 gba:max-h-48 gba:overflow-y-auto">
              {availableTeams.length > 0 ? (
                availableTeams.map(team => (
                  <div key={team.id} className="gba:flex gba:items-center gba:space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeams.includes(team.id)}
                      onCheckedChange={(checked) => 
                        handleTeamSelection(team.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`team-${team.id}`}
                      className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex-1"
                    >
                      {team.name}
                      <span className="gba:text-gray-500 gba:ml-2">
                        ({team.memberCount} members)
                      </span>
                    </label>
                  </div>
                ))
              ) : (
                <div className="gba:text-center gba:py-8">
                  <div className="gba:text-gray-500 gba:mb-2">No teams available</div>
                  <div className="gba:text-sm gba:text-gray-400">
                    Teams data integration is required to display sales teams for comparison.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Metric */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-metric-selection`}>
          <CardHeader>
            <CardTitle>Comparison Metric</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={comparisonMetric} onValueChange={(value: ComparisonMetric) => setComparisonMetric(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Total Revenue</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="activities">Sales Activities</SelectItem>
                <SelectItem value="pipeline">Pipeline Value</SelectItem>
                <SelectItem value="efficiency">Revenue per Member</SelectItem>
              </SelectContent>
            </Select>
            <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
              Teams will be ranked by this metric
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Sales Activities Dashboard */}
      {selectedTeams.length > 0 && comparisonMetric === 'activities' && (
        <div className="gba:space-y-6">
          {/* Activities Overview Grid */}
          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
            {/* Total Activities by Team */}
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-activities-by-team`}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <PiChartLine className="gba:w-5 gba:h-5 gba:text-purple-600" />
                  Sales Activities by Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:p-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activitiesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'totalActivities') return [value, 'Total Activities'];
                          if (name === 'activitiesPerMember') return [value, 'Activities per Member'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => {
                          const team = activitiesChartData.find(d => d.name === label);
                          return team?.fullName || label;
                        }}
                      />
                      <Bar dataKey="totalActivities" fill="#722ed1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activity Types Breakdown */}
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-activity-types-breakdown`}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <PiTarget className="gba:w-5 gba:h-5 gba:text-blue-600" />
                  Activity Types Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:p-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <div className="gba:flex gba:items-center gba:justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={activityTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                        >
                          {activityTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Activities']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activities Efficiency & Performance */}
          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
            {/* Activities vs Revenue Efficiency */}
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-activities-efficiency`}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <PiCurrencyDollar className="gba:w-5 gba:h-5 gba:text-green-600" />
                  Activity Efficiency (Revenue per Activity)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:p-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={activitiesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'totalActivities') return [value, 'Total Activities'];
                          if (name === 'efficiency') return [`€${value}K`, 'Revenue per Activity'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => {
                          const team = activitiesChartData.find(d => d.name === label);
                          return team?.fullName || label;
                        }}
                      />
                      <Bar yAxisId="left" dataKey="totalActivities" fill="#722ed1" />
                      <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activities per Member */}
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-activities-per-member`}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <PiUsers className="gba:w-5 gba:h-5 gba:text-orange-600" />
                  Activities per Team Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:p-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activitiesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value) => [value, 'Activities per Member']}
                        labelFormatter={(label) => {
                          const team = activitiesChartData.find(d => d.name === label);
                          return team?.fullName || label;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="activitiesPerMember" 
                        stroke="#ff9500" 
                        fill="#ff9500" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Standard Team Comparison Chart (for non-activities metrics) */}
      {selectedTeams.length > 0 && comparisonMetric !== 'activities' && (
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-comparison-chart`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiChartLine className="gba:w-5 gba:h-5 gba:text-blue-600" />
              Team Performance Comparison - {getMetricLabel(comparisonMetric)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="gba:flex gba:justify-center gba:p-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [value, getMetricLabel(comparisonMetric)]}
                    labelFormatter={(label) => {
                      const team = chartData.find(d => d.name === label);
                      return team?.fullName || label;
                    }}
                  />
                  <Bar 
                    dataKey={comparisonMetric === 'winRate' ? 'winRate' : comparisonMetric}
                    fill={getMetricColor(comparisonMetric)}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Performance Table */}
      {teamsData.length > 0 && (
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-performance-table`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiRanking className="gba:w-5 gba:h-5 gba:text-blue-600" />
              Team Performance Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:table-auto">
                <thead>
                  <tr className="gba:border-b">
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Rank</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Team</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Revenue</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Win Rate</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Activities</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Pipeline</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Trend</th>
                    <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsData.map((team) => (
                    <tr 
                      key={team.teamId}
                      className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                    >
                      <td className="gba:p-3">
                        <div className={`
                          gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-bold
                          ${team.ranking === 1 ? 'gba:bg-yellow-100 gba:text-yellow-800' : 
                            team.ranking <= 3 ? 'gba:bg-blue-100 gba:text-blue-800' : 
                            'gba:bg-gray-100 gba:text-gray-600'}
                        `}>
                          {team.ranking}
                        </div>
                      </td>
                      <td className="gba:p-3">
                        <div>
                          <div className="gba:font-medium">{team.teamName}</div>
                          <div className="gba:text-sm gba:text-gray-500">
                            {team.memberCount} members
                          </div>
                        </div>
                      </td>
                      <td className="gba:p-3">{formatCurrency(team.totalRevenue)}</td>
                      <td className="gba:p-3">{team.winRate.toFixed(1)}%</td>
                      <td className="gba:p-3">{team.totalActivities}</td>
                      <td className="gba:p-3">{formatCurrency(team.pipelineValue)}</td>
                      <td className="gba:p-3">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          {team.trend === 'up' ? (
                            <PiTrendUp className="gba:w-4 gba:h-4 gba:text-green-600" />
                          ) : team.trend === 'down' ? (
                            <PiTrendDown className="gba:w-4 gba:h-4 gba:text-red-600" />
                          ) : (
                            <div className="gba:w-4 gba:h-4 gba:bg-gray-400 gba:rounded-full"></div>
                          )}
                          <span className={`
                            gba:text-sm
                            ${team.trend === 'up' ? 'gba:text-green-600' : 
                              team.trend === 'down' ? 'gba:text-red-600' : 
                              'gba:text-gray-600'}
                          `}>
                            {team.trendPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="gba:p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTeamSelect?.(team.teamId, team.teamName)}
                          data-testid={`${DATA_TEST_ID_PREFIX}-drill-down-${team.teamId}`}
                        >
                          View Details
                          <PiArrowRight className="gba:w-4 gba:h-4 gba:ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CEOTeamComparisonDashboard;
