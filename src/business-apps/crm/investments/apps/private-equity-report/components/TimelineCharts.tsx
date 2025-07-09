import React from 'react';
import { Card } from 'antd';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart,
  Line,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ComposedChart,
  Bar,
  BarChart
} from 'recharts';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

interface TimelineChartsProps {
  timelineData: any[];
  stakeValueData: any[];
  leverageData: any[];
  riskReturnData: any[];
}

export const TimelineCharts: React.FC<TimelineChartsProps> = ({ 
  timelineData, 
  stakeValueData, 
  leverageData, 
  riskReturnData 
}) => {
  return (
    <>
      {/* Investment Timeline - Composed Chart */}
      <Card title="Investment Timeline Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart
            data={timelineData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Investment' || name === 'Average Value') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="investmentCount" 
              fill={CHART_COLORS[0]} 
              name="New Investments"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="totalInvestment" 
              stroke={CHART_COLORS[1]} 
              strokeWidth={3}
              name="Total Investment"
              dot={{ r: 4 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="averageValue" 
              stroke={CHART_COLORS[2]} 
              strokeWidth={2}
              name="Average Value"
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Value Appreciation Trends - Area Chart */}
      <Card title="Value Appreciation Trends" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={stakeValueData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')} />
            <Tooltip formatter={(value) => [formatCurrency(value as number, 'EUR'), 'Value']} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={CHART_COLORS[0]} 
              fill={CHART_COLORS[0]}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Phase Analysis - Composed Chart */}
      <Card title="Investment Phase Performance" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={leverageData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="phase" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Value' || name === 'Average Investment') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                if (name === 'Average ROI') {
                  return [formatPercentage(value as number), name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              fill={CHART_COLORS[0]} 
              name="Investment Count"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="right"
              dataKey="totalValue" 
              fill={CHART_COLORS[1]} 
              name="Total Value"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="averageROI" 
              stroke={CHART_COLORS[2]} 
              strokeWidth={3}
              name="Average ROI"
              dot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Fund Duration Analysis - Bar Chart */}
      <Card title="Fund Duration Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={riskReturnData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="duration" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Average Value') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                return [value, name];
              }}
            />
            <Bar 
              dataKey="count" 
              fill={CHART_COLORS[0]}
              name="Fund Count"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="averageValue" 
              fill={CHART_COLORS[1]}
              name="Average Value"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 