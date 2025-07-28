import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system';
import { RiBarChartLine } from '@remixicon/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AbsenceTrendsChartProps {
  barChartData: any[];
  totalAbsenceDays: number;
  uniqueGroups: string[];
  groupColors: { [key: string]: string };
}

export const AbsenceTrendsChart: React.FC<AbsenceTrendsChartProps> = ({
  barChartData,
  totalAbsenceDays,
  uniqueGroups,
  groupColors,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle>Absence Trends</CardTitle>
            <p className="gba:text-xs gba:text-muted-foreground">Monthly absence days by group</p>
            <div className="gba:text-2xl gba:font-bold gba:pt-2">{totalAbsenceDays}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Total Absence Days</div>
          </div>
          <RiBarChartLine className="gba:h-6 gba:w-6 gba:text-gray-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              barCategoryGap={0}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <RechartsTooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                allowEscapeViewBox={{ x: false, y: false }}
                content={({ active, payload, label }) => {
                  if (active && label) {
                    // Show all absence types, even if they have 0 values
                    const allTypes = uniqueGroups;
                    
                    return (
                      <div style={{ 
                        background: 'white', 
                        borderRadius: 8, 
                        boxShadow: '0 2px 8px #0001', 
                        padding: 12, 
                        fontSize: 13 
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                        {allTypes.map((type) => {
                          // Find the value for this type from the payload
                          const entry = payload?.find(p => p.dataKey === type);
                          const value = (entry?.value != null && entry.value !== undefined) ? entry.value : 0;
                          const color = groupColors[type] || undefined;
                          
                          return (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ 
                                width: 12, 
                                height: 12, 
                                background: color, 
                                display: 'inline-block', 
                                borderRadius: 3, 
                                marginRight: 6 
                              }} />
                              <span>{type}: {value} days</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {uniqueGroups.map((group) => (
                <Bar
                  key={group}
                  dataKey={group}
                  fill={groupColors[group] || undefined}
                  stackId="a"
                  maxBarSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend at bottom of container */}
        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
          {uniqueGroups.map((group) => (
            <div key={group} className="gba:flex gba:items-center gba:gap-2">
              <div 
                className="gba:w-3 gba:h-3 gba:rounded-sm"
                style={{ backgroundColor: groupColors[group] || undefined }}
              />
              <span className="gba:text-xs gba:text-gray-600">{group}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 