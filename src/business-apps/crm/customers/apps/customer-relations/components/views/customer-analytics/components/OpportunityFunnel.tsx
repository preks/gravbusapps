import React from 'react';
import { Card, Typography, Progress, Space, Tooltip } from 'antd';
import { FunnelPlotOutlined, BarChartOutlined } from '@ant-design/icons';
import { OpportunityFunnelData } from '../types/dashboardTypes';
import { formatCurrency, formatPercentage } from '../utils/dashboardUtils';
import { EmptyState } from './EmptyState';

const { Title, Text } = Typography;

export interface OpportunityFunnelProps {
  funnelData: OpportunityFunnelData[];
  pipelineId: string;
}

export const OpportunityFunnel: React.FC<OpportunityFunnelProps> = ({
  funnelData,
  pipelineId
}) => {
  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden">
        <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <FunnelPlotOutlined className="gba:text-blue-600 gba:text-lg" />
            </div>
            <Title level={4} className="gba:mb-0 gba:text-gray-900">
              Opportunity Funnel
            </Title>
          </div>
        </div>
        <div className="gba:p-6">
          <EmptyState
            title="No Funnel Data"
            description="No opportunities found for this pipeline"
          />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...funnelData.map(stage => stage.count));
  const totalOpportunities = funnelData.reduce((sum, stage) => sum + stage.count, 0);
  const totalValue = funnelData.reduce((sum, stage) => sum + stage.value, 0);

  return (
    <div
      data-testid={`opportunity-funnel-${pipelineId}`}
      className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden"
    >
      {/* Enhanced Header */}
      <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <FunnelPlotOutlined className="gba:text-blue-600 gba:text-lg" />
            </div>
            <Title level={4} className="gba:mb-0 gba:text-gray-900">
              Opportunity Funnel
            </Title>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <BarChartOutlined className="gba:text-blue-500" />
            <Text className="gba:text-sm gba:text-gray-600 gba:font-medium">
              {totalOpportunities} total
            </Text>
          </div>
        </div>
      </div>

      {/* Enhanced Funnel Content */}
      <div className="gba:p-6">
        <div className="gba:space-y-5">
          {funnelData.map((stage, index) => {
            const progressPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const stageColor = stage.stage.color || 'var(--nw-info)';
            const avgDealSize = stage.count > 0 ? stage.value / stage.count : 0;

            return (
              <div
                key={stage.stage.id}
                data-testid={`funnel-stage-${stage.stage.ref}`}
                className="gba:group gba:transition-all gba:duration-200 hover:gba:bg-gray-50 gba:p-4 gba:rounded-lg gba:-m-4"
              >
                {/* Stage Header */}
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-3">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div 
                      className="gba:w-3 gba:h-3 gba:rounded-full gba:shadow-sm"
                      style={{ backgroundColor: stageColor }}
                    />
                    <Text className="gba:font-semibold gba:text-gray-900 gba:text-base">
                      {stage.stage.name}
                    </Text>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:text-sm gba:text-gray-600">
                      {stage.count} deals
                    </div>
                    <div className="gba:text-lg gba:font-bold gba:text-gray-900">
                      {formatCurrency(stage.value)}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="gba:mb-3">
                  <Tooltip 
                    title={`${stage.count} opportunities (${formatPercentage(stage.percentage)}) • ${formatCurrency(stage.value)}`}
                  >
                    <Progress
                      percent={progressPercent}
                      strokeColor={{
                        '0%': stageColor,
                        '100%': `${stageColor}80`,
                      }}
                      trailColor="var(--nw-accent)"
                      size="small"
                      showInfo={false}
                      className="gba:transition-all gba:duration-300 group-hover:gba:shadow-sm"
                    />
                  </Tooltip>
                </div>
                
                {/* Stage Metrics */}
                <div className="gba:flex gba:justify-between gba:items-center gba:text-sm">
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <span className="gba:text-gray-500">
                      {formatPercentage(stage.percentage)} of total
                    </span>
                    <span className="gba:text-gray-500">
                      Avg: {formatCurrency(avgDealSize)}
                    </span>
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="gba:text-gray-400 gba:text-xs">
                      → Next stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Funnel Summary */}
        <div className="gba:mt-6 gba:bg-gradient-to-r gba:from-gray-50 gba:to-blue-50 gba:rounded-xl gba:p-5 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <Text className="gba:text-gray-700 gba:font-semibold gba:text-base">
              Funnel Summary
            </Text>
            <div className="gba:p-1 gba:bg-blue-100 gba:rounded-md">
              <BarChartOutlined className="gba:text-blue-600 gba:text-sm" />
            </div>
          </div>
          
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded-lg gba:shadow-sm">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                {totalOpportunities}
              </div>
              <div className="gba:text-sm gba:text-gray-600 gba:font-medium">
                Total Opportunities
              </div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded-lg gba:shadow-sm">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                {formatCurrency(totalValue)}
              </div>
              <div className="gba:text-sm gba:text-gray-600 gba:font-medium">
                Total Value
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 