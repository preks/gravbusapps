import React from 'react';
import { Card, Empty } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: {
    date: string;
    value: number;
  }[];
  title: string;
  xAxisDataKey?: string;
  lineDataKey?: string;
  lineColor?: string;
  height?: number;
}

/**
 * Reusable line chart component for time series analytics
 */
const LineChartComponent: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  xAxisDataKey = 'date',
  lineDataKey = 'value',
  lineColor = '#52c41a',
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
          <LineChart
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
              formatter={(value) => [`${value}`, 'Amount']}
              labelFormatter={(label) => `${label}`}
            />
            <Line 
              type="monotone" 
              dataKey={lineDataKey} 
              stroke={lineColor} 
              activeDot={{ r: 8 }} 
              name="Amount"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default LineChartComponent;
