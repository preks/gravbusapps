import React from 'react';
import { Card, Typography, Row, Col, Spin, Alert, Button, Tag, Select, Dropdown, Menu } from 'antd';
import { LineChartOutlined, TrophyOutlined, RiseOutlined, SwapOutlined, DownOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from '../types/dashboardTypes';
import { usePipelineData } from '../hooks/usePipelineData';
import { OpportunityFunnel } from './OpportunityFunnel';
import { WinRateKpis } from './WinRateKpis';
import { ActivityVolume } from './ActivityVolume';
import { SalesLeaderboard } from './SalesLeaderboard';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatLargeNumber } from '../utils/dashboardUtils';

const { Title, Text } = Typography;

export interface PipelineSectionProps extends BusinessAppContextProps {
  pipeline: PipelineInfo;
  dateRange: DateRange;
  pipelines?: PipelineInfo[];
  selectedPipelineId?: string;
  onPipelineChange?: (pipelineId: string) => void;
}

export const PipelineSection: React.FC<PipelineSectionProps> = ({
  pipeline,
  dateRange,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  ...context
}) => {
  const { pipelineData, isLoading, error, refetch } = usePipelineData(
    context,
    pipeline,
    dateRange
  );

  if (isLoading) {
    return (
      <div className="gba:bg-white gba:rounded-2xl gba:shadow-xl gba:border gba:border-gray-100 gba:overflow-hidden">
        <div 
          data-testid={`pipeline-section-${pipeline.id}-loading`}
          className="gba:flex gba:items-center gba:justify-center gba:py-16"
        >
          <div className="gba:text-center">
            <Spin size="large" />
            <div className="gba:mt-4 gba:text-gray-600">
              Loading {pipeline.name} data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:bg-white gba:rounded-2xl gba:shadow-xl gba:border gba:border-gray-100 gba:overflow-hidden">
        <div className="gba:p-6">
          <Alert
            data-testid={`pipeline-section-${pipeline.id}-error`}
            message="Error Loading Pipeline Data"
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
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <div className="gba:bg-white gba:rounded-2xl gba:shadow-xl gba:border gba:border-gray-100 gba:overflow-hidden">
        <div className="gba:p-6">
          <EmptyState
            title="No Pipeline Data"
            description="Unable to load data for this pipeline"
          />
        </div>
      </div>
    );
  }

  const { metrics, opportunities, winRateMetrics, activityVolume, funnelData, leaderboard } = pipelineData;

  return (
    <div
      data-testid={`pipeline-section-${pipeline.id}`}
      className="gba:bg-white gba:rounded-2xl gba:shadow-xl gba:border gba:border-gray-100 gba:overflow-hidden"
    >
      {/* Enhanced Pipeline Header */}
      <div 
        className="gba:bg-gradient-to-r gba:from-gray-50 gba:to-gray-100 gba:border-l-4 gba:px-6 gba:py-6"
        style={{ borderLeftColor: pipeline.color || '#1890ff' }}
      >
        <div className="gba:flex gba:flex-col lg:gba:flex-row gba:justify-between gba:items-start lg:gba:items-center gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div 
              className="gba:p-3 gba:rounded-xl gba:shadow-sm"
              style={{ backgroundColor: `${pipeline.color || '#1890ff'}20` }}
            >
              <LineChartOutlined 
                className="gba:text-2xl"
                style={{ color: pipeline.color || '#1890ff' }}
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-3">
              <div>
                <Title level={2} className="gba:mb-0 gba:text-gray-900">
                  {pipeline.name}
                </Title>
                {pipeline.description && (
                  <Text className="gba:text-gray-600 gba:text-base">
                    {pipeline.description}
                  </Text>
                )}
              </div>
              {pipelines && pipelines.length > 1 && onPipelineChange && (
                <Dropdown
                  trigger={['click']}
                  placement="bottomLeft"
                  menu={{
                    items: pipelines.map((p) => ({
                      key: p.id,
                      label: (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                          {p.description && (
                            <span className="gba:text-gray-400 gba:text-xs">
                              ({p.description})
                            </span>
                          )}
                        </div>
                      ),
                      onClick: () => onPipelineChange(p.id)
                    }))
                  }}
                >
                  <Button 
                    data-testid="pipeline-selector-button"
                    type="text" 
                    icon={<DownOutlined />}
                    className="gba:text-gray-500 hover:gba:text-gray-700"
                    size="small"
                  />
                </Dropdown>
              )}
            </div>
          </div>
          
          <div className="gba:flex gba:flex-wrap gba:gap-3 gba:items-center">
            <Tag 
              color="blue" 
              className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:rounded-lg"
            >
              {metrics.totalOpportunities} opportunities
            </Tag>
            <Tag 
              color="green"
              className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:rounded-lg"
            >
              {formatCurrency(metrics.totalValue)}
            </Tag>
            <Tag 
              color="purple"
              className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:rounded-lg"
            >
              {metrics.conversionRate.toFixed(1)}% conversion
            </Tag>
          </div>
        </div>
      </div>

      <div className="gba:p-6">
        {/* Enhanced KPI Overview Grid */}
        <Row gutter={[16, 16]} className="gba:mb-8">
          <Col xs={24} sm={12} lg={6}>
            <div className="gba:bg-gradient-to-br gba:from-blue-50 gba:to-blue-100 gba:rounded-xl gba:p-6 gba:border gba:border-blue-200 gba:h-full">
              <div data-testid={`pipeline-${pipeline.id}-total-value`} className="gba:text-center">
                <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                  <RiseOutlined className="gba:text-blue-600 gba:text-lg gba:mr-2" />
                  <Text className="gba:text-blue-700 gba:text-sm gba:font-medium">Total Pipeline Value</Text>
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
                  {formatCurrency(metrics.totalValue)}
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div className="gba:bg-gradient-to-br gba:from-green-50 gba:to-green-100 gba:rounded-xl gba:p-6 gba:border gba:border-green-200 gba:h-full">
              <div data-testid={`pipeline-${pipeline.id}-avg-deal-size`} className="gba:text-center">
                <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                  <TrophyOutlined className="gba:text-green-600 gba:text-lg gba:mr-2" />
                  <Text className="gba:text-green-700 gba:text-sm gba:font-medium">Avg Deal Size</Text>
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-900">
                  {formatCurrency(metrics.avgDealSize)}
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div className="gba:bg-gradient-to-br gba:from-orange-50 gba:to-orange-100 gba:rounded-xl gba:p-6 gba:border gba:border-orange-200 gba:h-full">
              <div data-testid={`pipeline-${pipeline.id}-conversion-rate`} className="gba:text-center">
                <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                  <LineChartOutlined className="gba:text-orange-600 gba:text-lg gba:mr-2" />
                  <Text className="gba:text-orange-700 gba:text-sm gba:font-medium">Conversion Rate</Text>
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
                  {metrics.conversionRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div className="gba:bg-gradient-to-br gba:from-purple-50 gba:to-purple-100 gba:rounded-xl gba:p-6 gba:border gba:border-purple-200 gba:h-full">
              <div data-testid={`pipeline-${pipeline.id}-sales-cycle`} className="gba:text-center">
                <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
                  <RiseOutlined className="gba:text-purple-600 gba:text-lg gba:mr-2" />
                  <Text className="gba:text-purple-700 gba:text-sm gba:font-medium">Avg Sales Cycle</Text>
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
                  {Math.round(metrics.avgSalesCycle)} days
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Enhanced Main KPI Components Grid */}
        <Row gutter={[24, 24]}>
          {/* Left Column */}
          <Col xs={24} xl={12}>
            <div className="gba:space-y-6">
              {/* Opportunity Funnel */}
              <OpportunityFunnel
                funnelData={funnelData}
                pipelineId={pipeline.id}
              />
              
              {/* Win Rate KPIs */}
              <WinRateKpis
                winRateMetrics={winRateMetrics}
                pipelineId={pipeline.id}
              />
            </div>
          </Col>

          {/* Right Column */}
          <Col xs={24} xl={12}>
            <div className="gba:space-y-6">
              {/* Activity Volume */}
              <ActivityVolume
                activityVolume={activityVolume}
                pipelineId={pipeline.id}
              />
              
              {/* Sales Leaderboard */}
              <SalesLeaderboard
                leaderboard={leaderboard}
                pipelineId={pipeline.id}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}; 