import React from 'react';
import { Typography } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { formatLargeNumber } from '../utils/dashboardUtils';

const { Title, Text } = Typography;

export interface RevenueSourceChartProps {
  revenueData: Array<{
    source: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  title: string;
  totalRevenue: number; // Now represents total lead count
}

export const RevenueSourceChart: React.FC<RevenueSourceChartProps> = ({
  revenueData,
  title,
  totalRevenue
}) => {
  if (!revenueData || revenueData.length === 0) {
    return (
      <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden gba:h-full">
        <div className="gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
              <PieChartOutlined className="gba:text-green-600 gba:text-lg" />
            </div>
            <Title level={4} className="gba:mb-0 gba:text-gray-900">
              {title}
            </Title>
          </div>
        </div>
        <div className="gba:p-6 gba:flex gba:items-center gba:justify-center gba:h-64">
          <Text className="gba:text-gray-500">No revenue data available</Text>
        </div>
      </div>
    );
  }

  // Create SVG donut chart
  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativePercentage = 0;

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-lg gba:border gba:border-gray-200 gba:overflow-hidden gba:h-full">
      {/* Header */}
      <div className="gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:px-6 gba:py-4 gba:border-b gba:border-gray-200">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
            <PieChartOutlined className="gba:text-green-600 gba:text-lg" />
          </div>
          <Title level={4} className="gba:mb-0 gba:text-gray-900">
            {title}
          </Title>
        </div>
      </div>

      {/* Chart Content */}
      <div className="gba:p-6">
        <div className="gba:flex gba:flex-col gba:items-center">
          {/* SVG Donut Chart */}
          <div className="gba:relative gba:mb-6">
            <svg width={size} height={size} className="gba:transform gba:-rotate-90">
              {revenueData.map((item, index) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -cumulativePercentage * circumference / 100;
                
                // Calculate position for text label (middle of the arc)
                const midAngle = (cumulativePercentage + item.percentage / 2) * 2 * Math.PI / 100 - Math.PI / 2;
                const labelRadius = radius - strokeWidth / 4; // Position closer to outer edge
                const labelX = size / 2 + labelRadius * Math.cos(midAngle);
                const labelY = size / 2 + labelRadius * Math.sin(midAngle);
                
                cumulativePercentage += item.percentage;

                return (
                  <g key={item.source}>
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="gba:transition-all gba:duration-300 hover:gba:opacity-80"
                    />
                    {/* Show count in each segment if percentage is large enough */}
                    {item.percentage > 15 && (
                      <g>
                        {/* Background circle for better text readability */}
                        <circle
                          cx={labelX}
                          cy={labelY}
                          r="16"
                          fill="rgba(0,0,0,0.6)"
                          stroke="white"
                          strokeWidth="1"
                        />
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="gba:fill-white gba:font-bold"
                          style={{ 
                            fontSize: '11px',
                            pointerEvents: 'none'
                          }}
                        >
                          {formatLargeNumber(item.value)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Center Content */}
            <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center">
              <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {formatLargeNumber(totalRevenue)}
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                Total Leads
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="gba:w-full gba:space-y-3">
            {revenueData.map((item) => (
              <div key={item.source} className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div 
                    className="gba:w-3 gba:h-3 gba:rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="gba:text-sm gba:text-gray-700">{item.source}</span>
                </div>
                <div className="gba:text-right">
                  <div className="gba:text-sm gba:font-medium gba:text-gray-900">
                    {item.percentage}%
                  </div>
                  <div className="gba:text-xs gba:text-gray-500">
                    {formatLargeNumber(item.value)} leads
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 