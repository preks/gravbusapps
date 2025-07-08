import React from 'react';
import { Row, Col, Card, Typography, Spin, Alert, Button, Tag } from 'antd';
import { 
  FunnelPlotOutlined, 
  PieChartOutlined, 
  CalendarOutlined, 
  CheckSquareOutlined,
  TrophyOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { useOverviewData, OverviewData } from '../hooks/useOverviewData';
import { OverviewFunnel } from './OverviewFunnel';
import { RevenueSourceChart } from './RevenueSourceChart';
import { EmptyState } from './EmptyState';

const { Title, Text } = Typography;

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
          <Spin size="large" />
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
        <Alert
          message="Error Loading Overview Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch} type="primary">
              Retry
            </Button>
          }
          className="gba:shadow-sm"
        />
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
      <Row gutter={[24, 24]}>
        {/* Left Column - Pipeline Funnel */}
        <Col xs={24} lg={12} xl={8}>
          <OverviewFunnel 
            funnelData={overviewData.aggregatedFunnel}
            title="All Pipeline - Current Year"
            totalValue={overviewData.totalPipelineValue}
          />
        </Col>

        {/* Middle Column - Revenue Sources */}
        <Col xs={24} lg={12} xl={8}>
          <RevenueSourceChart
            revenueData={overviewData.revenueBySource}
            title="Potential Revenue Source - Current Year"
            totalRevenue={overviewData.totalRevenue}
          />
        </Col>

        {/* Right Column - Recent Records */}
        <Col xs={24} lg={24} xl={8}>
          <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden gba:h-full">
            <div className="gba:bg-gradient-to-r gba:from-purple-50 gba:to-indigo-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-purple-100 gba:rounded-lg">
                  <TrophyOutlined className="gba:text-purple-600 gba:text-lg" />
                </div>
                <Title level={4} className="gba:mb-0 gba:text-gray-900">
                  Recent Records
                </Title>
              </div>
            </div>
            <div className="gba:p-6">
              <div className="gba:space-y-4">
                {overviewData.recentRecords.slice(0, 5).map((record, index: number) => (
                  <div 
                    key={record.id}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-gray-50 gba:rounded-lg hover:gba:bg-gray-100 gba:transition-colors"
                  >
                    <div className="gba:w-8 gba:h-8 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
                      <span className="gba:text-blue-600 gba:text-sm gba:font-medium">
                        {record.type === 'opportunity' ? 'O' : record.type === 'lead' ? 'L' : 'C'}
                      </span>
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:text-sm gba:font-medium gba:text-gray-900">
                        {record.name}
                      </div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {record.type} • {new Date(record.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="gba:text-center gba:pt-2">
                  <Button type="link" size="small" className="gba:text-blue-600">
                    View All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Bottom Row - Tasks and Activities */}
      <Row gutter={[24, 24]}>
        {/* Today's Tasks */}
        <Col xs={24} lg={12}>
          <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden">
            <div className="gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
                  <CheckSquareOutlined className="gba:text-green-600 gba:text-lg" />
                </div>
                <Title level={4} className="gba:mb-0 gba:text-gray-900">
                  Active Tasks
                </Title>
              </div>
            </div>
            <div className="gba:p-6">
              {overviewData.activeTasks.length > 0 ? (
                <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
                  {overviewData.activeTasks.slice(0, 5).map((task) => (
                    <div 
                      key={task.id}
                      className={`gba:flex gba:items-start gba:gap-3 gba:p-3 gba:rounded-lg gba:transition-colors ${
                        task.isOverdue 
                          ? 'gba:bg-red-50 hover:gba:bg-red-100 gba:border gba:border-red-200' 
                          : 'gba:bg-green-50 hover:gba:bg-green-100'
                      }`}
                      data-testid={`task-item-${task.id}`}
                    >
                      <div className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:mt-1 ${
                        task.isOverdue ? 'gba:bg-red-100' : 'gba:bg-green-100'
                      }`}>
                        <span className={`gba:text-xs gba:font-medium ${
                          task.isOverdue ? 'gba:text-red-600' : 'gba:text-green-600'
                        }`}>
                          {task.priority.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <div className={`gba:text-sm gba:font-medium gba:truncate ${
                            task.isOverdue ? 'gba:text-red-700' : 'gba:text-gray-900'
                          }`}>
                            {task.name}
                          </div>
                          <Tag 
                            color={task.priority === 'High' ? 'red' : task.priority === 'Normal' ? 'blue' : 'default'}
                          >
                            {task.priority}
                          </Tag>
                        </div>
                        {task.description && (
                          <div className="gba:text-xs gba:text-gray-600 gba:mb-1 gba:truncate">
                            {task.description}
                          </div>
                        )}
                        <div className="gba:text-xs gba:text-gray-500">
                          {task.assignedTo} • {task.relatedTo}
                        </div>
                        {task.dueDate && (
                          <div className={`gba:text-xs gba:mt-1 ${
                            task.isOverdue ? 'gba:text-red-600 gba:font-medium' : 'gba:text-gray-400'
                          }`}>
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                            {task.isOverdue && ' (Overdue)'}
                          </div>
                        )}
                      </div>
                      <div className="gba:flex-shrink-0">
                        <Tag color={task.status === 'Completed' ? 'green' : 'orange'}>
                          {task.status}
                        </Tag>
                      </div>
                    </div>
                  ))}
                  <div className="gba:text-center gba:pt-2">
                    <Button type="link" size="small" className="gba:text-green-600">
                      View All Tasks
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-center">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-green-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                      <CheckSquareOutlined className="gba:text-2xl gba:text-green-500" />
                    </div>
                    <Text className="gba:text-gray-600 gba:text-lg">
                      No active tasks. All caught up!
                    </Text>
                    <div className="gba:mt-4">
                      <Button type="link" size="small" className="gba:text-green-600">
                        View All Tasks
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>

        {/* Today's Activities */}
        <Col xs={24} lg={12}>
          <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden">
            <div className="gba:bg-gradient-to-r gba:from-orange-50 gba:to-amber-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:p-2 gba:bg-orange-100 gba:rounded-lg">
                  <CalendarOutlined className="gba:text-orange-600 gba:text-lg" />
                </div>
                <Title level={4} className="gba:mb-0 gba:text-gray-900">
                  Today's Activities
                </Title>
              </div>
            </div>
            <div className="gba:p-6">
              {overviewData.todaysActivities.length > 0 ? (
                <div className="gba:space-y-4 gba:max-h-64 gba:overflow-y-auto">
                  {overviewData.todaysActivities.slice(0, 5).map((activity) => (
                    <div 
                      key={activity.id}
                      className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:bg-orange-50 gba:rounded-lg hover:gba:bg-orange-100 gba:transition-colors"
                    >
                      <div className="gba:w-8 gba:h-8 gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:mt-1">
                        <span className="gba:text-orange-600 gba:text-xs gba:font-medium">
                          {activity.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
                          {activity.title}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                          {activity.type} • {activity.owner}
                        </div>
                        {activity.relatedTo !== 'No relation' && (
                          <div className="gba:text-xs gba:text-blue-600 gba:mt-1">
                            Related to: {activity.relatedTo}
                          </div>
                        )}
                        <div className="gba:text-xs gba:text-gray-400 gba:mt-1">
                          {new Date(activity.createdAt).toLocaleTimeString()} 
                          {activity.completedAt && (
                            <span className="gba:text-green-600 gba:ml-2">✓ Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="gba:text-center gba:pt-2">
                    <Button type="link" size="small" className="gba:text-orange-600">
                      View All Activities
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-center">
                    <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-orange-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mb-4">
                      <CalendarOutlined className="gba:text-2xl gba:text-orange-500" />
                    </div>
                    <Text className="gba:text-gray-600 gba:text-lg">
                      No activities scheduled for today.
                    </Text>
                    <div className="gba:mt-4">
                      <Button type="link" size="small" className="gba:text-orange-600">
                        Schedule Activity
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Key Deals Section */}
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden">
            <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-cyan-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
                    <RiseOutlined className="gba:text-blue-600 gba:text-lg" />
                  </div>
                  <Title level={4} className="gba:mb-0 gba:text-gray-900">
                    Key Deals - Recent Opportunities
                  </Title>
                </div>
                <Button type="link" size="small" className="gba:text-blue-600">
                  View All Key Deals
                </Button>
              </div>
            </div>
            <div className="gba:p-6">
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
                {overviewData.keyDeals.slice(0, 6).map((deal) => (
                  <div 
                    key={deal.id}
                    className="gba:p-4 gba:bg-gradient-to-br gba:from-gray-50 gba:to-blue-50 gba:rounded-lg gba:border gba:border-gray-200 hover:gba:shadow-md gba:transition-all"
                  >
                    <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                      <div className="gba:text-sm gba:font-semibold gba:text-gray-900">
                        {deal.name}
                      </div>
                      <div className="gba:text-xs gba:bg-blue-100 gba:text-blue-700 gba:px-2 gba:py-1 gba:rounded">
                        {deal.stage}
                      </div>
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
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}; 