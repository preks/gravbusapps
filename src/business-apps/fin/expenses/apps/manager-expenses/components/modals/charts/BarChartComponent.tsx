import React from 'react';
import { Card, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: {
    name: string;
    value: number;
  }[];
  title: string;
  xAxisDataKey?: string;
  barDataKey?: string;
  barColor?: string;
  height?: number;
}

/**
 * Reusable bar chart component for analytics
 */
const BarChartComponent: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  xAxisDataKey = 'name',
  barDataKey = 'value',
  barColor = '#1890ff',
  height = 300
}) => {
  if (!data || data.length === 0) {
    return (
      <Card title={title} className="gba:w-full">
        <Empty description="No data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card title={title} className="gba:w-full">
      <div style={{ height: height }} data-testid={`${title.toLowerCase().replace(/\s+/g, '-')}-chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value}`, 'Value']}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey={barDataKey} fill={barColor} name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default BarChartComponent;
