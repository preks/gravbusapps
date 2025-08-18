import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Spinner } from '@newwork/nw-design-system';

interface TenureDistributionChartProps {
  data: Array<{
    category: string;
    value: number;
  }>;
  isLoading: boolean;
  dataTestId: string;
}

const TenureDistributionChart: React.FC<TenureDistributionChartProps> = ({
  data,
  isLoading,
  dataTestId
}) => {
  // Transform data for recharts format with proper ordering
  const chartData = data.map(item => ({
    tenureRange: item.category,
    employees: item.value
  })).sort((a, b) => {
    // Sort by tenure range order
    const order = ['< 1 year', '1-2 years', '3-5 years', '6-10 years', '11-15 years', '16-20 years', '21+ years'];
    return order.indexOf(a.tenureRange) - order.indexOf(b.tenureRange);
  });

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <p className="gba:text-gray-500">No tenure distribution data available</p>
      </div>
    );
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="tenureRange" 
            tick={{ fontSize: 10 }}
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'Employees', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value) => `Tenure: ${value}`}
            formatter={(value: number) => [value, 'Employees']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar 
            dataKey="employees" 
            fill="#722ed1"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TenureDistributionChart; 