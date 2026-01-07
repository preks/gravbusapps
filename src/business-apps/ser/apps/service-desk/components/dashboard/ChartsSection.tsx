import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts'
import { TrendingUp, BarChart3, PieChart as PieChartIcon, AlertTriangle } from 'lucide-react'
import { useChartData } from './hooks/useChartData'

/**
 * Charts Section Component - Displays analytics charts and activity feed using live service desk data
 */
export interface ChartsSectionProps extends BusinessAppContextProps {
  onTaskSelect?: (taskId: string, deskKey: string) => void
}

// Import ActivityFeed
import { ActivityFeed } from './ActivityFeed'

export const ChartsSection: React.FC<ChartsSectionProps> = ({ accessToken, userInfo, onTaskSelect }) => {
  // Get USER-FOCUSED chart data
  const { myStatusDistribution, myWeeklyActivity, myResponseTimeTrend, isLoading, error } = useChartData({
    accessToken,
    userInfo
  })

  // Show loading state
  if (isLoading) {
    return (
      <div className="gba:space-y-6" data-testid="charts-section-loading">
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('services.dashboard.charts.section_title', 'My Performance Insights')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.charts.section_description',
              'Visual overview of your personal productivity, workload status, and performance trends'
            )}
          </p>
        </div>

        {/* Charts & Activity Grid - 3 columns */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6">
          {/* Chart placeholders */}
          <div className="gba:h-[400px] gba:bg-muted gba:rounded-lg gba:animate-pulse" />
          <div className="gba:h-[400px] gba:bg-muted gba:rounded-lg gba:animate-pulse" />

          {/* Activity Feed placeholder */}
          <div className="gba:lg:row-span-2 gba:h-[400px] gba:bg-muted gba:rounded-lg gba:animate-pulse" />

          {/* Response Time Chart placeholder (spans 2 columns) */}
          <div className="gba:lg:col-span-2 gba:h-[400px] gba:bg-muted gba:rounded-lg gba:animate-pulse" />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:space-y-6" data-testid="charts-section-error">
        <div className="gba:text-center gba:py-8">
          <AlertTriangle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-destructive" />
          <p className="gba:text-destructive gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('services.dashboard.charts.error_title', 'Unable to load chart data')}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="charts-section">
      {/* Section Header */}
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('services.dashboard.charts.section_title', 'My Performance Insights')}
        </h2>
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.charts.section_description',
            'Visual overview of your personal productivity, workload status, and performance trends'
          )}
        </p>
      </div>

      {/* Charts & Activity Grid - 3 columns */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6">
        {/* My Ticket Status Distribution - Pie Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PieChartIcon className="gba:h-5 gba:w-5 gba:text-chart-2" />
              {getTranslationFromI18nKeyAndLabel('services.dashboard.charts.my_status', 'My Ticket Status')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.my_status_description',
                'Current breakdown of your tickets by status'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              {myStatusDistribution.length === 0 ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
                  <p className="gba:text-sm">No ticket data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={myStatusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {myStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={String(entry.fill)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Weekly Activity - Bar Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <BarChart3 className="gba:h-5 gba:w-5 gba:text-chart-1" />
              {getTranslationFromI18nKeyAndLabel('services.dashboard.charts.my_activity', 'My Weekly Activity')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.my_activity_description',
                'Tickets you completed each day this week'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={myWeeklyActivity}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="var(--nw-chart-1)" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - Right Column */}
        <div className="gba:lg:row-span-2">
          <ActivityFeed accessToken={accessToken} userInfo={userInfo} onTaskSelect={onTaskSelect} />
        </div>

        {/* My Response Time Trend - Line Chart (spans 2 columns) */}
        <Card className="gba:border gba:bg-card gba:lg:col-span-2">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <TrendingUp className="gba:h-5 gba:w-5 gba:text-chart-3" />
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.my_response_time',
                'My Response Time Trend'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.my_response_time_description',
                'Your average response time over the last 4 weeks compared to target'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={myResponseTimeTrend}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgTime"
                    stroke="var(--nw-chart-1)"
                    strokeWidth={2}
                    name="My Avg Time (hrs)"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="var(--nw-chart-4)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Target (4 hrs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
