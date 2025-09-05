import React from 'react';
import { Card } from 'antd';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/common/data/investment';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

interface EquityTimelineChartsProps {
  equityTimelineData: any[];
  topCompaniesByValuationData: any[];
}

export const EquityTimelineCharts: React.FC<EquityTimelineChartsProps> = ({
  equityTimelineData,
  topCompaniesByValuationData
}) => {
  return (
    <>
      {/* Equity Investment Performance Timeline - Full Width Row */}
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card title="Equity Investment Performance Timeline" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={equityTimelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Total Valuation' || name === 'Total EBITDA') {
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
                dataKey="totalValuation"
                stroke={CHART_COLORS[1]}
                strokeWidth={3}
                name="Total Valuation"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalEbitda"
                stroke={CHART_COLORS[2]}
                strokeWidth={2}
                name="Total EBITDA"
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                stroke={CHART_COLORS[3]}
                strokeWidth={2}
                name="Cumulative Investments"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Companies by Valuation - Full Width Row */}
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card title="Top 10 Companies by Valuation" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={topCompaniesByValuationData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="company"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={11}
                tickFormatter={(value) => {
                  // Truncate company names longer than 15 characters
                  return value.length > 15 ? `${value.substring(0, 15)}...` : value;
                }}
              />
              <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={formatPercentage} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Valuation' || name === 'EBITDA') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  if (name === 'Stake') {
                    return [formatPercentage(value as number), name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  // Show full company name in tooltip
                  if (payload && payload.length > 0) {
                    return payload[0]?.payload?.company || label;
                  }
                  return label;
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="valuation"
                fill={CHART_COLORS[0]}
                name="Valuation"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="ebitda"
                fill={CHART_COLORS[1]}
                name="EBITDA"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="stake"
                stroke={CHART_COLORS[2]}
                strokeWidth={3}
                name="Stake"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}; 