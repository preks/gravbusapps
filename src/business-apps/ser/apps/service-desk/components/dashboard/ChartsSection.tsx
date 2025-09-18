import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from '@newwork/nw-design-system';
import {
  Area,
  AreaChart,
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
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useChartData } from './hooks/useChartData';

/**
 * Charts Section Component - Displays analytics charts using live service desk data
 */
export interface ChartsSectionProps extends BusinessAppContextProps {}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  accessToken,
  userInfo,
}) => {
  // Get real chart data from service desk APIs
  const { 
    ticketVolumeData, 
    deskDistributionData, 
    resolutionTimeData, 
    priorityData, 
    isLoading, 
    error 
  } = useChartData({
    accessToken,
    userInfo,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="gba:space-y-6" data-testid="charts-section-loading">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.title',
                'Charts & Analytics'
              )}
            </h2>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <Loader2 className="gba:size-4 gba:animate-spin gba:text-primary" />
            <span>Loading charts...</span>
          </div>
        </div>
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="gba:h-96 gba:bg-muted gba:rounded-lg gba:animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:space-y-6" data-testid="charts-section-error">
        <div className="gba:text-center gba:py-8">
          <AlertTriangle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-destructive" />
          <p className="gba:text-destructive gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.charts.error_title',
              'Unable to load chart data'
            )}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {error}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="gba:space-y-6" data-testid="charts-section">
      {/* Section Header */}
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.charts.section_title',
            'Analytics & Performance Charts'
          )}
        </h2>
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.charts.section_description',
            'Visual insights into ticket trends, resolution performance, and workload distribution'
          )}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        
        {/* Ticket Volume Trends - Line Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <TrendingUp className="gba:h-5 gba:w-5 gba:text-chart-1" />
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.volume_trends',
                'Ticket Volume Trends'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.volume_description',
                'Daily ticket creation vs resolution over the last week'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="var(--nw-chart-1)" 
                    strokeWidth={2}
                    name="Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="var(--nw-chart-2)" 
                    strokeWidth={2}
                    name="Resolved"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pending" 
                    stroke="var(--nw-chart-3)" 
                    strokeWidth={2}
                    name="Pending"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Desk Distribution - Pie Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PieChartIcon className="gba:h-5 gba:w-5 gba:text-chart-2" />
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.desk_distribution',
                'Service Desk Distribution'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.desk_description',
                'Ticket distribution across different service desks'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deskDistributionData}
                    dataKey="tickets"
                    nameKey="desk"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ desk, tickets }) => `${desk}: ${tickets}`}
                  >
                    {deskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Time Trends - Area Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Activity className="gba:h-5 gba:w-5 gba:text-chart-3" />
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.resolution_trends',
                'Resolution Time Trends'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.resolution_description',
                'Average resolution time vs SLA target over time'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resolutionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="avgTime"
                    stroke="var(--nw-chart-1)"
                    fill="var(--nw-chart-1)"
                    fillOpacity={0.3}
                    name="Avg Resolution Time"
                  />
                  <Line
                    type="monotone"
                    dataKey="slaTarget"
                    stroke="var(--nw-chart-4)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="SLA Target"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution - Bar Chart */}
        <Card className="gba:border gba:bg-card">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <BarChart3 className="gba:h-5 gba:w-5 gba:text-chart-4" />
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.priority_distribution',
                'Priority Distribution'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.charts.priority_description',
                'Breakdown of tickets by priority level'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tickets">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Status Info */}
      <div className="gba:mt-6 gba:text-center">
        <p className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.charts.status_info',
            'Interactive charts powered by live service desk analytics'
          )}
        </p>
      </div>
    </div>
  );
};
