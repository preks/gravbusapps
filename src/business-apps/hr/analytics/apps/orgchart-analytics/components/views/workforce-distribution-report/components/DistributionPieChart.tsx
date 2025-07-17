import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, Typography } from 'antd';
import type { DistributionSegment } from '../types/workforceTypes';

const { Title } = Typography;

interface DistributionPieChartProps {
  data: DistributionSegment[];
  title: string;
  height?: number;
  dataTestId?: string;
}

const DistributionPieChart: React.FC<DistributionPieChartProps> = ({
  data,
  title,
  height = 350,
  dataTestId = 'distribution-pie-chart'
}) => {
  const chartData = data.map(segment => ({
    name: segment.name,
    value: segment.count,
    percentage: segment.percentage,
    fill: segment.color
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg"
          style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
        >
          <p className="gba:font-semibold gba:text-gray-900">{data.name}</p>
          <p className="gba:text-blue-600">
            Count: <span className="gba:font-medium">{data.value}</span>
          </p>
          <p className="gba:text-green-600">
            Percentage: <span className="gba:font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      data-testid={dataTestId}
      style={{ height: height + 60 }}
    >
      <Title level={5} style={{ textAlign: 'center', marginBottom: '16px', color: '#1f2937' }}>
        {title}
      </Title>
      
      {data.length === 0 ? (
        <div style={{ 
          height: height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#6b7280'
        }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default DistributionPieChart; 