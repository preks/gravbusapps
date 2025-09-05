import React from 'react';
import { Card } from 'antd';
import { 
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ComposedChart,
  Bar
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/common/data/investment';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

interface TimelineChartsProps {
  performanceTimelineData: any[];
  yieldValueData: any[];
  maturityYieldData: any[];
  interestRateDistributionData: any[];
}

export const LiquidFundTimelineCharts: React.FC<TimelineChartsProps> = ({ 
  performanceTimelineData, 
  yieldValueData, 
  maturityYieldData, 
  interestRateDistributionData 
}) => {
  return (
    <>
      {/* Investment Timeline - Composed Chart */}
      <Card title="Investment Timeline Analysis" style={{ borderRadius: '8px' }}>
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

      {/* Value Trends - Area Chart */}
      <Card title="Value Trends Over Time" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={yieldValueData}
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

      {/* Performance Comparison - Line Chart */}
      <Card title="Performance Comparison Over Time" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={maturityYieldData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatPercentage} />
            <Tooltip formatter={(value) => [formatPercentage(value as number), 'Performance']} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="fundPerformance" 
              stroke={CHART_COLORS[0]} 
              strokeWidth={3}
              name="Fund Performance"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="benchmarkPerformance" 
              stroke={CHART_COLORS[1]} 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Benchmark"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Volatility Analysis - Composed Chart */}
      <Card title="Volatility Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={interestRateDistributionData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="period" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Volatility' || name === 'Performance') {
                  return [formatPercentage(value as number), name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="volatility" 
              fill={CHART_COLORS[0]} 
              name="Volatility"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="performance" 
              stroke={CHART_COLORS[1]} 
              strokeWidth={3}
              name="Performance"
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 