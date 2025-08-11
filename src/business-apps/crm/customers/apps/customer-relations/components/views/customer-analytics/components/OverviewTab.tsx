import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Badge
} from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent
} from '@newwork/nw-design-system';
import { 
  Filter, 
  PieChart as PieChartIcon, 
  Calendar, 
  CheckSquare,
  Trophy,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { useOverviewData, OverviewData } from '../hooks/useOverviewData';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatLargeNumber } from '../utils/dashboardUtils';

export interface OverviewTabProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[];
  dateRange: DateRange;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  pipelines,
  dateRange,
  ...context
}) => {
  const { overviewData, isLoading, error, refetch } = useOverviewData(
    context,
    pipelines,
    dateRange
  );

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600">
            Loading overview data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" className="gba:shadow-sm">
          <AlertTitle>Error Loading Overview Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button size="sm" onClick={refetch} variant="default">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="gba:p-6">
        <EmptyState
          title="No Overview Data"
          description="Unable to load overview data"
        />
      </div>
    );
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="overview-tab">
      {/* Main Dashboard Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:xl:grid-cols-3 gba:gap-6">
        {/* Left Column - Pipeline Funnel */}
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <Card className="gba:h-full">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
                  <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
                </div>
                <div>
                  <CardTitle>All Pipeline - Current Year</CardTitle>
                  <CardDescription>Opportunity progression by stage</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {overviewData.aggregatedFunnel && overviewData.aggregatedFunnel.length > 0 ? (
                <div className="gba:space-y-4">
                  {/* Funnel visualization */}
                  <div className="gba:relative gba:flex gba:flex-col gba:items-center gba:space-y-2">
                    {overviewData.aggregatedFunnel.map((stage, index) => {
                      const maxValue = Math.max(...overviewData.aggregatedFunnel.map(s => s.value));
                      const widthPercentage = (stage.value / maxValue) * 100;
                      const actualWidth = Math.max(widthPercentage, 20);

                      return (
                        <div
                          key={stage.stage}
                          className="gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-105"
                          style={{
                            width: `${actualWidth}%`,
                            minWidth: '120px',
                            height: '50px',
                            backgroundColor: stage.color || `hsl(${index * 60}, 70%, 50%)`,
                            clipPath: index === 0 
                              ? 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'
                              : index === overviewData.aggregatedFunnel.length - 1
                              ? 'polygon(5% 0, 95% 0, 90% 100%, 10% 100%)'
                              : 'polygon(5% 0, 95% 0, 90% 100%, 10% 100%)',
                            borderRadius: '4px'
                          }}
                        >
                          <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-white gba:text-center gba:px-2">
                            <div className="gba:text-sm gba:font-bold">
                              {formatCurrency(stage.value)}
                            </div>
                            <div className="gba:text-xs gba:opacity-90">
                              {stage.count} opp{stage.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage legend */}
                  <div className="gba:space-y-2 gba:mt-4">
                    {overviewData.aggregatedFunnel.map((stage, index) => (
                      <div key={stage.stage} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-sm"
                            style={{ backgroundColor: stage.color || `hsl(${index * 60}, 70%, 50%)` }}
                          />
                          <span className="gba:text-gray-700">{stage.stage}</span>
                        </div>
                        <div className="gba:text-right">
                          <div className="gba:font-medium gba:text-gray-900">
                            {formatCurrency(stage.value)}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">
                            {stage.count} opp{stage.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total summary */}
                  <div className="gba:pt-4 gba:border-t gba:border-gray-200">
                    <div className="gba:text-center">
                      <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                        {overviewData.aggregatedFunnel.reduce((sum, stage) => sum + stage.count, 0)}
                      </div>
                      <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                        Total Opportunities
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gba:text-center gba:py-8">
                  <div className="gba:text-gray-500">No funnel data available</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Lead Sources */}
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <Card className="gba:h-full">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
                  <PieChartIcon className="gba:h-5 gba:w-5 gba:text-green-600" />
                </div>
                <div>
                  <CardTitle>Lead Sources - Open Leads</CardTitle>
                  <CardDescription>Distribution by source</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {overviewData.revenueBySource && overviewData.revenueBySource.length > 0 ? (
                <div className="gba:space-y-4">
                  {/* Chart with center content */}
                  <div className="gba:relative gba:w-full gba:flex gba:justify-center">
                    <ChartContainer 
                      config={{
                        value: {
                          label: "Leads",
                          color: "hsl(var(--nw-chart-2))"
                        }
                      }} 
                      className="gba:w-[300px] gba:h-[300px]"
                    >
                      <PieChart width={300} height={300}>
                        <Pie
                          data={overviewData.revenueBySource}
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="80%"
                          dataKey="value"
                          nameKey="source"
                        >
                          {overviewData.revenueBySource.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color || `hsl(${index * 50}, 70%, 50%)`}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      </PieChart>
                    </ChartContainer>
                    
                    {/* Center content overlay */}
                    <div className="gba:absolute gba:pointer-events-none" style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}>
                      <div className="gba:text-center">
                        <div className="gba:text-base gba:font-semibold gba:text-gray-700">
                          Total Leads
                        </div>
                        <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                          {formatLargeNumber(overviewData.totalRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="gba:border-t gba:border-gray-200 gba:pt-4">
                    <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4">
                      {overviewData.revenueBySource.map((item, index) => (
                        <div key={item.source} className="gba:flex gba:items-center gba:gap-2">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full"
                            style={{ backgroundColor: item.color || `hsl(${index * 50}, 70%, 50%)` }}
                          />
                          <span className="gba:text-sm gba:text-gray-700">{item.source}</span>
                          <span className="gba:text-sm gba:font-medium gba:text-gray-900">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gba:text-center gba:py-8">
                  <div className="gba:text-gray-500">No revenue data available</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Records */}
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <Card className="gba:h-full">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-amber-100 gba:rounded-lg">
                  <Trophy className="gba:h-5 gba:w-5 gba:text-amber-600" />
                </div>
                <div>
                  <CardTitle>Recent Records</CardTitle>
                  <CardDescription>Latest activity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-4">
                {overviewData.recentRecords.slice(0, 3).map((record, index: number) => (
                                      <Card 
                      key={record.id}
                      className="gba:transition-colors hover:gba:shadow-md"
                    >
                    <CardHeader className="gba:pb-2">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:w-8 gba:h-8 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          <span className="gba:text-blue-600 gba:text-sm gba:font-medium">
                            {record.type === 'opportunity' ? 'O' : record.type === 'lead' ? 'L' : 'C'}
                          </span>
                        </div>
                        <CardTitle className="gba:text-sm">
                          {record.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        {record.type} • {new Date(record.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
                <div className="gba:text-center gba:pt-2">
                  <Button variant="link" size="sm" className="gba:text-blue-600">
                    View All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row - Tasks and Activities */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        {/* Today's Tasks */}
        <div>
          <Card className="gba:h-full">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
                  <CheckSquare className="gba:h-6 gba:w-6 gba:text-green-600" />
                </div>
                <CardTitle>
                  Active Tasks
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {overviewData.activeTasks.length > 0 ? (
                <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
                  {overviewData.activeTasks.slice(0, 5).map((task) => (
                    <Card 
                      key={task.id}
                      className="gba:transition-colors hover:gba:shadow-md"
                      data-testid={`task-item-${task.id}`}
                    >
                      <CardHeader className="gba:pb-2">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
                            task.isOverdue ? 'gba:bg-red-100' : 'gba:bg-green-100'
                          }`}>
                            <span className={`gba:text-xs gba:font-medium ${
                              task.isOverdue ? 'gba:text-red-600' : 'gba:text-green-600'
                            }`}>
                              {task.priority.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                            <CardTitle className={`gba:text-sm gba:truncate ${
                              task.isOverdue ? 'gba:text-red-700' : ''
                            }`}>
                              {task.name}
                            </CardTitle>
                            <Badge 
                              variant={task.priority === 'High' ? 'destructive' : task.priority === 'Normal' ? 'default' : 'secondary'}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <Badge variant={task.status === 'Completed' ? 'default' : 'outline'}>
                            {task.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {task.description && (
                          <CardDescription className="gba:mb-2 gba:truncate">
                            {task.description}
                          </CardDescription>
                        )}
                        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
                          {task.assignedTo} • {task.relatedTo}
                        </div>
                        {task.dueDate && (
                          <div className={`gba:text-xs ${
                            task.isOverdue ? 'gba:text-red-600 gba:font-medium' : 'gba:text-gray-400'
                          }`}>
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                            {task.isOverdue && ' (Overdue)'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <div className="gba:text-center gba:pt-2">
                    <Button variant="link" size="sm" className="gba:text-green-600">
                      View All Tasks
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-center">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-green-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                      <CheckSquare className="gba:h-8 gba:w-8 gba:text-green-500" />
                    </div>
                    <div className="gba:text-gray-600 gba:text-lg">
                      No active tasks. All caught up!
                    </div>
                    <div className="gba:mt-4">
                      <Button variant="link" size="sm" className="gba:text-green-600">
                        View All Tasks
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Activities */}
        <div>
          <Card className="gba:h-full">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
                  <Calendar className="gba:h-6 gba:w-6 gba:text-blue-600" />
                </div>
                <CardTitle>
                  Today's Activities
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {overviewData.todaysActivities.length > 0 ? (
                <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
                  {overviewData.todaysActivities.slice(0, 5).map((activity) => (
                    <Card 
                      key={activity.id}
                      className="gba:transition-colors hover:gba:shadow-md"
                    >
                      <CardHeader className="gba:pb-2">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <div className="gba:w-8 gba:h-8 gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                            <span className="gba:text-orange-600 gba:text-xs gba:font-medium">
                              {activity.type.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <CardTitle className="gba:text-sm gba:truncate">
                            {activity.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="gba:mb-2">
                          {activity.type} • {activity.owner}
                        </CardDescription>
                        {activity.relatedTo !== 'No relation' && (
                          <div className="gba:text-xs gba:text-blue-600 gba:mb-1">
                            Related to: {activity.relatedTo}
                          </div>
                        )}
                        <div className="gba:text-xs gba:text-gray-400">
                          {new Date(activity.createdAt).toLocaleTimeString()} 
                          {activity.completedAt && (
                            <span className="gba:text-green-600 gba:ml-2">✓ Completed</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="gba:text-center gba:pt-2">
                    <Button variant="link" size="sm" className="gba:text-orange-600">
                      View All Activities
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-center">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                      <Calendar className="gba:h-8 gba:w-8 gba:text-orange-500" />
                    </div>
                    <div className="gba:text-gray-600 gba:text-lg">
                      No activities scheduled for today.
                    </div>
                    <div className="gba:mt-4">
                      <Button variant="link" size="sm" className="gba:text-orange-600">
                        Schedule Activity
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Deals Section */}
      <div>
        <Card className="gba:h-full">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-indigo-100 gba:rounded-lg">
                  <TrendingUp className="gba:text-indigo-600 gba:h-6 gba:w-6" />
                </div>
                <CardTitle>
                  Key Deals - Recent Opportunities
                </CardTitle>
              </div>
              <Button variant="link" size="sm" className="gba:text-blue-600">
                View All Key Deals
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
              {overviewData.keyDeals.slice(0, 6).map((deal) => (
                <div 
                  key={deal.id}
                  className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 hover:gba:shadow-md gba:transition-all"
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                    <div className="gba:text-sm gba:font-semibold gba:text-gray-900">
                      {deal.name}
                    </div>
                    <Badge variant="secondary">
                      {deal.stage}
                    </Badge>
                  </div>
                  <div className="gba:text-lg gba:font-bold gba:text-blue-600 gba:mb-1">
                    {deal.value}
                  </div>
                  <div className="gba:text-xs gba:text-gray-500">
                    {deal.owner} • {deal.closeDate}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 