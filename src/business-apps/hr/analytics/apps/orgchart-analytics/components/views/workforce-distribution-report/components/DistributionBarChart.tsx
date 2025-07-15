import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, Typography } from 'antd';
import type { DistributionSegment } from '../types/workforceTypes';

const { Title } = Typography;

interface DistributionBarChartProps {
  data: DistributionSegment[];
  title: string;
  height?: number;
  dataTestId?: string;
  layout?: 'horizontal' | 'vertical';
}

const DistributionBarChart: React.FC<DistributionBarChartProps> = ({
  data,
  title,
  height = 350,
  dataTestId = 'distribution-bar-chart',
  layout = 'horizontal'
}) => {
  const chartData = data.map(segment => ({
    name: segment.name.length > 20 ? `${segment.name.substring(0, 20)}...` : segment.name,
    fullName: segment.name,
    value: segment.count,
    percentage: segment.percentage,
    fill: segment.color
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg"
          style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
        >
          <p className="gba:font-semibold gba:text-gray-900">{data.fullName}</p>
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

  if (layout === 'horizontal') {
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
            <BarChart
              layout="horizontal"
              data={chartData}
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#8884d8"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    );
  }

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
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default DistributionBarChart; 