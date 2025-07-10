import React from 'react';
import { Typography, Tooltip } from 'antd';
import { FunnelPlotOutlined } from '@ant-design/icons';
import { formatCurrency, formatLargeNumber } from '../utils/dashboardUtils';

const { Title, Text } = Typography;

export interface OverviewFunnelProps {
  funnelData: Array<{
    stage: string;
    count: number;
    value: number;
    percentage: number;
    color: string;
  }>;
  title: string;
  totalValue: number;
}

export const OverviewFunnel: React.FC<OverviewFunnelProps> = ({
  funnelData,
  title,
  totalValue
}) => {
  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden gba:h-full">
        <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <FunnelPlotOutlined className="gba:text-blue-600 gba:text-lg" />
            </div>
            <Title level={4} className="gba:mb-0 gba:text-gray-900">
              {title}
            </Title>
          </div>
        </div>
        <div className="gba:p-6 gba:flex gba:items-center gba:justify-center gba:h-64">
          <Text className="gba:text-gray-500">No funnel data available</Text>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...funnelData.map(stage => stage.value));

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden gba:h-full">
      {/* Header */}
      <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
            <FunnelPlotOutlined className="gba:text-blue-600 gba:text-lg" />
          </div>
          <Title level={4} className="gba:mb-0 gba:text-gray-900">
            {title}
          </Title>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="gba:p-6">
        <div className="gba:relative gba:flex gba:flex-col gba:items-center gba:space-y-2">
          {funnelData.map((stage, index) => {
            const widthPercentage = (stage.value / maxValue) * 100;
            const minWidth = 20; // Minimum width for visibility
            const actualWidth = Math.max(widthPercentage, minWidth);

            return (
              <Tooltip
                key={stage.stage}
                title={`${stage.stage}: ${stage.count} opportunities • ${formatCurrency(stage.value)}`}
              >
                <div
                  className="gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-105"
                  style={{
                    width: `${actualWidth}%`,
                    minWidth: '120px',
                    height: '60px',
                    backgroundColor: stage.color,
                    clipPath: index === 0 
                      ? 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'
                      : index === funnelData.length - 1
                      ? 'polygon(5% 0, 95% 0, 90% 100%, 10% 100%)'
                      : 'polygon(5% 0, 95% 0, 90% 100%, 10% 100%)',
                    borderRadius: '4px'
                  }}
                >
                  {/* Stage Content */}
                  <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-white gba:text-center gba:px-2">
                    <div className="gba:text-lg gba:font-bold">
                      {formatCurrency(stage.value)}
                    </div>
                    <div className="gba:text-xs gba:opacity-90">
                      {stage.count} opp{stage.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Stage Legend */}
        <div className="gba:mt-6 gba:space-y-2">
          {funnelData.map((stage) => (
            <div key={stage.stage} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div 
                  className="gba:w-3 gba:h-3 gba:rounded-sm"
                  style={{ backgroundColor: stage.color }}
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

        {/* Total Summary */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200">
          <div className="gba:text-center">
            <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
              {funnelData.reduce((sum, stage) => sum + stage.count, 0)}
            </div>
            <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
              Total Opportunities
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 