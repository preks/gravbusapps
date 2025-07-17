import React from 'react';
import { Card, Typography } from 'antd';
import { SunburstChart, ResponsiveContainer, Tooltip } from 'recharts';
import { SunburstNode } from '../types/structuralTypes';

const { Title } = Typography;

interface SunburstVisualizationProps {
  data: SunburstNode;
  prefixDataTestId?: string;
}

interface SunburstTooltipProps {
  active?: boolean;
  payload?: any[];
}

// Transform our SunburstNode data to match the working example format
const transformToSunburstFormat = (node: SunburstNode): any => {
  const transformed: any = {
    name: node.name,
    value: node.value,
    fill: node.color || node.fill || '#666' // Use the color set in utils, fallback to gray
  };

  if (node.children && node.children.length > 0) {
    transformed.children = node.children.map((child) => 
      transformToSunburstFormat(child)
    );
  }

  return transformed;
};

const SunburstTooltip: React.FC<SunburstTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '12px',
          maxWidth: '250px'
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
          {data.name}
        </p>
        <p style={{ margin: 0, color: '#666', marginBottom: '4px' }}>
          <strong>Level:</strong> {data.level >= 0 ? data.level : 'Root'}
        </p>
        <p style={{ margin: 0, color: '#666', marginBottom: '4px' }}>
          <strong>Total Employees:</strong> {data.value}
        </p>
        {data.employees && data.employees.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
              Direct Employees ({data.employees.length}):
            </p>
            <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
              {data.employees.slice(0, 10).map((emp: string, idx: number) => (
                <p key={idx} style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                  • {emp || 'Unknown'}
                </p>
              ))}
              {data.employees.length > 10 && (
                <p style={{ margin: 0, fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                  ... and {data.employees.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
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
      title={
        <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
          Organizational Hierarchy Sunburst
        </Title>
      }
      style={{ height: '600px' }}
    >
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
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '450px',
            color: '#666'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No Organizational Hierarchy Data
          </div>
          <div style={{ fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
            The organizational hierarchy data is either empty or still loading.<br/>
            Please ensure your structure has organizational units with relationships.
          </div>
        </div>
      )}
    </Card>
  );
}; 