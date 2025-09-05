import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { 
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/common/data/investment';
import { renderLineTooltip, CHART_COLORS } from '../utils';

interface PortfolioTimelineChartsProps {
  performanceTimelineData: any[];
  valueOverTimeData: any[];
}

export const PortfolioTimelineCharts: React.FC<PortfolioTimelineChartsProps> = ({
  performanceTimelineData,
  valueOverTimeData
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <Card>
        <CardHeader>
          <CardTitle>Investment Performance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
              data={performanceTimelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Total Value') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  if (name === 'Average ROI') {
                    return [formatPercentage(value as number / 100), name];
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
                dataKey="totalValue" 
                stroke={CHART_COLORS[1]} 
                strokeWidth={3}
                name="Total Value"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="averageROI" 
                stroke={CHART_COLORS[2]} 
                strokeWidth={2}
                name="Average ROI"
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="cumulativeInvestments" 
                stroke={CHART_COLORS[3]} 
                strokeWidth={2}
                name="Cumulative Investments"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Value Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={valueOverTimeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')} />
              <Tooltip formatter={(value) => [formatCurrency(value as number, 'EUR'), 'Value']} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};


