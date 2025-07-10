import React from 'react';
import { Typography, theme } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
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
  const { token } = theme.useToken();
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  // Transform data for Recharts
  const chartData = React.useMemo(() => {
    return revenueData.map(item => ({
      name: item.source,
      value: item.value,
      percentage: item.percentage,
      color: item.color
    }));
  }, [revenueData]);

  // Standard colors from HR analytics pattern  
  const COLORS = [
    '#1890FF', '#2FC25B', '#FACC14', '#223273', '#8543E0', '#13C2C2', 
    '#3436C7', '#F04864', '#D0021B', '#5B8FF9', '#5AD8A6', '#5D7092',
    '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99'
  ];

  // Custom active shape for hover effect
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 6}
          outerRadius={innerRadius - 2}
          fill={fill}
        />
        <text x={cx} y={cy - 20} textAnchor="middle" fill={token.colorText} fontSize={18} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={token.colorTextSecondary} fontSize={14}>
          {formatLargeNumber(value)} leads
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" fill={token.colorPrimary} fontSize={14} fontWeight="600">
          {payload.percentage}%
        </text>
      </g>
    );
  };

  // Event handlers for pie slice hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(-1);
  };

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
          {/* Recharts Donut Chart */}
          <div className="gba:h-[300px] gba:w-full gba:mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || COLORS[index % COLORS.length]} 
                      stroke={token.colorBgContainer} 
                      strokeWidth={2}
                    />
                  ))}
                  {/* Center content */}
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" 
                        style={{ fontSize: '16px', fill: token.colorText, fontWeight: 600 }}>
                    Total Leads
                  </text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" 
                        style={{ fontSize: '24px', fontWeight: 'bold', fill: token.colorTextHeading }}>
                    {formatLargeNumber(totalRevenue)}
                  </text>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="gba:w-full gba:pt-4 gba:border-t gba:border-gray-200">
            <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4">
              {chartData.map((item, index) => (
                <div key={item.name} className="gba:flex gba:items-center gba:gap-2">
                  <div 
                    className="gba:w-3 gba:h-3 gba:rounded-full"
                    style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                  />
                  <span className="gba:text-sm gba:text-gray-700">{item.name}</span>
                  <span className="gba:text-sm gba:font-medium gba:text-gray-900">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 