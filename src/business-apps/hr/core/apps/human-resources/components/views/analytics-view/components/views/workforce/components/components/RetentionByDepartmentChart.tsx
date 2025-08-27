import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Spinner } from '@newwork/nw-design-system';

interface RetentionByDepartmentChartProps {
  data: Array<{
    category: string;
    value: number;
  }>;
  isLoading: boolean;
  dataTestId: string;
}

const RetentionByDepartmentChart: React.FC<RetentionByDepartmentChartProps> = ({
  data,
  isLoading,
  dataTestId
}) => {
  // Transform data for recharts format, sorted by retention rate (lowest first for easy identification)
  const chartData = data.map(item => ({
    department: item.category.length > 12 ? `${item.category.substring(0, 10)}...` : item.category,
    fullDepartment: item.category,
    retentionRate: item.value
  })).sort((a, b) => a.retentionRate - b.retentionRate);

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
        <p className="gba:text-gray-500">No retention by department data available</p>
      </div>
    );
  }

  // Function to get bar color based on retention rate
  const getBarColor = (retentionRate: number) => {
    if (retentionRate < 75) return '#ff4d4f'; // Red for low retention
    if (retentionRate < 85) return '#fa8c16'; // Orange for moderate retention
    return '#52c41a'; // Green for good retention
  };

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="department" 
            tick={{ fontSize: 10 }}
            stroke="#666"
            height={80}
            interval={0}
            angle={-45}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value, payload) => {
              // Find the full department name from the payload
              const item = payload?.[0]?.payload;
              return `Department: ${item?.fullDepartment || value}`;
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retention Rate']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar 
            dataKey="retentionRate" 
            radius={[4, 4, 0, 0]}
            stroke="#333"
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.retentionRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RetentionByDepartmentChart; 