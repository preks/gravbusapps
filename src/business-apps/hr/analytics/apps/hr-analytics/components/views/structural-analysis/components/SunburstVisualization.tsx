import React from 'react';
import { Card, Typography } from 'antd';
import { SunburstChart, ResponsiveContainer, Tooltip } from 'recharts';
import { SunburstNode } from '../types/structuralTypes';

const { Title, Text } = Typography;

interface SunburstVisualizationProps {
  data: SunburstNode;
  prefixDataTestId?: string;
}

// Custom tooltip component for sunburst
const SunburstTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div 
        style={{ 
          backgroundColor: 'white', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          padding: '8px' 
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
        <p style={{ margin: 0, color: '#666' }}>
          Employees: {data.value}
        </p>
        {data.companyName && (
          <p style={{ margin: 0, color: '#666' }}>
            Company: {data.companyName}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Transform hierarchical data to sunburst format
const transformToSunburstFormat = (node: SunburstNode): any => {
  return {
    name: node.name,
    value: node.value,
    children: node.children?.map(transformToSunburstFormat) || []
  };
};

export const SunburstVisualization: React.FC<SunburstVisualizationProps> = ({
  data,
  prefixDataTestId = 'StructuralAnalysis'
}) => {
  const hasData = data && data.value > 0;
  
  // Transform data to match the working sunburst format
  const sunburstData = hasData ? transformToSunburstFormat(data) : null;

  return (
    <Card
      data-testid={`${prefixDataTestId}-SunburstVisualization`}
      style={{ height: '600px' }}
    >
      <div className="gba:p-4 gba:border-b">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          Organizational Hierarchy Sunburst
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          Interactive hierarchical visualization showing organizational depth and structure distribution across different levels
        </Text>
      </div>
      
      <div className="gba:p-4">
        {hasData && sunburstData ? (
          <ResponsiveContainer height={450} width="100%">
            <SunburstChart
              data={sunburstData}
              startAngle={0}
              endAngle={360}
              fill=""
              innerRadius={10}
              ringPadding={1}
              stroke=""
              textOptions={{}}
            >
              <Tooltip content={<SunburstTooltip />} />
            </SunburstChart>
          </ResponsiveContainer>
        ) : (
          <div 
            className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-96 gba:text-gray-500"
          >
            <div className="gba:text-4xl gba:mb-4 gba:text-gray-400">📊</div>
            <div className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-gray-700">
              No Organizational Hierarchy Data
            </div>
            <div className="gba:text-sm gba:text-center gba:leading-6 gba:text-gray-600">
              The organizational hierarchy data is either empty or still loading.<br/>
              Please ensure your structure has organizational units with relationships.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}; 