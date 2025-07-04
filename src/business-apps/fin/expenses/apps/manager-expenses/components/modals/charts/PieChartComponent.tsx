import React from 'react';
import { Card, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumberFunction } from '@/common/utils/windowUtils';

interface PieChartProps {
  data: {
    name: string;
    value: number;
  }[];
  title: string;
  nameKey?: string;
  dataKey?: string;
  height?: number;
  colors?: string[];
}

/**
 * Reusable pie chart component for analytics
 */
const PieChartComponent: React.FC<PieChartProps> = ({ 
  data, 
  title, 
  nameKey = 'name',
  dataKey = 'value',
  height = 300,
  colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa8c16']
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => {
                const total = data.reduce((sum, item) => sum + item.value, 0);
                const percent = ((Number(value) / total) * 100).toFixed(0);
                return [`${formatNumberFunction(value.toString(), "0.00[,]00")} (${percent}%)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PieChartComponent;
