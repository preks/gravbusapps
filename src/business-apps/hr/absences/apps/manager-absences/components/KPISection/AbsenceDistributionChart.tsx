import React from 'react';
import { CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system';
import { RiPieChart2Line } from '@remixicon/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface AbsenceDistributionChartProps {
  pieChartData: { name: string; value: number }[];
  totalAbsenceDays: number;
  vacationShare: string;
  groupColors: { [key: string]: string };
}

export const AbsenceDistributionChart: React.FC<AbsenceDistributionChartProps> = ({
  pieChartData,
  totalAbsenceDays,
  vacationShare,
  groupColors,
}) => {
  // Get current year for subtitle
  const currentYear = new Date().getFullYear();
  
  // Calculate current year vacation share from pieChartData
  const currentYearVacationShare = pieChartData.length > 0 ? vacationShare : '0';
  
  // Custom label function to show percentage on segments
  const renderLabel = (entry: any) => {
    // Calculate total from pie chart data (current year only)
    const currentYearTotal = pieChartData.reduce((sum, item) => sum + item.value, 0);
    const percent = currentYearTotal > 0 ? ((entry.value / currentYearTotal) * 100).toFixed(1) : '0.0';
    
    // Special positioning for Vacation segment (move it lower and to the right)
    if (entry.name === 'Vacation') {
      return (
        <text
          x={entry.cx + (entry.outerRadius * 1.3) * Math.cos(-entry.midAngle * Math.PI / 180) + 15}
          y={entry.cy + (entry.outerRadius * 1.3) * Math.sin(-entry.midAngle * Math.PI / 180) + 15}
          fill={groupColors['Vacation'] || '#34d399'}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fontWeight="bold"
        >
          {`${percent}%`}
        </text>
      );
    }
    
    return `${percent}%`;
  };



  return (
    <>
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:p-6">
        <div>
          <h5 className="gba:text-sm gba:font-medium">Absence Distribution</h5>
          <p className="gba:text-xs gba:text-muted-foreground">Distribution for {currentYear}</p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{currentYearVacationShare}%</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left gba:pb-3">Vacation Share</div>
        </div>
        <RiPieChart2Line className="gba:h-6 gba:w-6 gba:text-gray-500" />
      </div>
      <div className="gba:h-[415px] gba:w-full gba:px-6 gba:pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 35, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={0}
              fill="#8884d8"
              dataKey="value"
              stroke="none"
              fontSize={14}
              fontWeight="bold"
            >
              {pieChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={groupColors[entry.name] || undefined} 
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  const name = data.name;
                  const value = data.value;
                  const color = groupColors[name as string] || undefined;
                  // Calculate percentage using current year total
                  const currentYearTotal = pieChartData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = currentYearTotal > 0 ? ((value as number / currentYearTotal) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <div style={{ 
                      background: 'white', 
                      borderRadius: 8, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                      padding: 12, 
                      fontSize: 13,
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ 
                          width: 12, 
                          height: 12, 
                          background: color, 
                          display: 'inline-block', 
                          borderRadius: 3, 
                          marginRight: 6 
                        }} />
                        <span style={{ fontWeight: 600 }}>{name}</span>
                      </div>
                      <div style={{ color: '#666' }}>{value} days</div>
                      <div style={{ color: '#666' }}>{percentage}% of total</div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
          {pieChartData.map((entry, index) => (
            <div key={index} className="gba:flex gba:items-center gba:gap-2">
              <div 
                className="gba:w-3 gba:h-3 gba:rounded-sm"
                style={{ backgroundColor: groupColors[entry.name] || undefined }}
              />
              <span className="gba:text-xs gba:text-gray-600">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}; 