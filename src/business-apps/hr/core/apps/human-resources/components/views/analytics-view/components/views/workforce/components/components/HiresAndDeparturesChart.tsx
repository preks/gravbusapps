import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Spinner } from '@newwork/nw-design-system';

interface HiresAndDeparturesChartProps {
  hiresData: Array<{
    category: string;
    dateCategory: string;
    value: number;
  }>;
  exitsData: Array<{
    category: string;
    dateCategory: string;
    value: number;
  }>;
  netChangeData: Array<{
    category: string;
    dateCategory: string;
    value: number;
  }>;
  isLoading: boolean;
  dataTestId: string;
}

const HiresAndDeparturesChart: React.FC<HiresAndDeparturesChartProps> = ({
  hiresData,
  exitsData,
  netChangeData,
  isLoading,
  dataTestId
}) => {
  // Combine all data by date
  const combinedData = React.useMemo(() => {
    const dataMap = new Map();
    
    // Add hires data
    hiresData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).hires = item.value;
    });
    
    // Add exits data
    exitsData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).departures = item.value;
    });
    
    // Add net change data
    netChangeData.forEach(item => {
      const date = new Date(item.dateCategory).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!dataMap.has(item.dateCategory)) {
        dataMap.set(item.dateCategory, { date, hires: 0, departures: 0, netChange: 0 });
      }
      dataMap.get(item.dateCategory).netChange = item.value;
    });
    
    // Convert to array and sort by date
    return Array.from(dataMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([_, data]) => data);
  }, [hiresData, exitsData, netChangeData]);

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    );
  }

  if (combinedData.length === 0) {
    return (
      <div data-testid={`${dataTestId}-empty`} className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <p className="gba:text-gray-500">No hires and departures data available</p>
      </div>
    );
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full gba:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value) => `Month: ${value}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="hires" 
            stroke="#52c41a"
            strokeWidth={2}
            name="New Hires"
            dot={{ fill: '#52c41a', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#52c41a' }}
          />
          <Line 
            type="monotone" 
            dataKey="departures" 
            stroke="#ff4d4f"
            strokeWidth={2}
            name="Departures"
            dot={{ fill: '#ff4d4f', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#ff4d4f' }}
          />
          <Line 
            type="monotone" 
            dataKey="netChange" 
            stroke="#1890ff"
            strokeWidth={3}
            name="Net Change"
            dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#1890ff' }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HiresAndDeparturesChart; 