import React from 'react';
import { Card } from 'antd';
import {
  ComposedChart,
  ScatterChart,
  Scatter,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

interface EquityAnalyticsChartsProps {
  stakeVsValuationData: any[];
  ebitdaValuationAnalysisData: any[];
  rolePerformanceData: any[];
  concentrationByRoleData: any[];
  valuationDistributionData: any[];
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = ({
  stakeVsValuationData,
  ebitdaValuationAnalysisData,
  rolePerformanceData,
  concentrationByRoleData,
  valuationDistributionData
}) => {
  return (
    <>
      {/* Stake vs Valuation Correlation - Scatter Plot (Full Width) */}
      <div style={{ 
        gridColumn: '1 / -1', 
        marginBottom: '24px' 
      }}>
        <Card title="Stake vs Company Valuation Correlation" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart
              data={stakeVsValuationData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="stake" 
                name="Stake %"
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="number" 
                dataKey="valuation" 
                name="Valuation"
                tickFormatter={(value) => formatCurrency(value, 'EUR')}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Valuation') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  if (name === 'Stake %') {
                    return [`${value}%`, name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    return `${payload[0]?.payload?.name}`;
                  }
                  return label;
                }}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <Scatter 
                name="Stake vs Valuation" 
                data={stakeVsValuationData} 
                fill={CHART_COLORS[0]}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* EBITDA vs Company Valuation Analysis - Composed Chart */}
      <Card title="EBITDA vs Company Valuation Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart
            data={ebitdaValuationAnalysisData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <XAxis 
              dataKey="range" 
              angle={-45}
              textAnchor="end"
              height={60}
              fontSize={11}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Valuation' || name === 'Average EBITDA') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              fill={CHART_COLORS[0]} 
              name="Company Count"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Bar 
              yAxisId="right"
              dataKey="totalValuation" 
              fill={CHART_COLORS[1]} 
              name="Total Valuation"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="averageEbitda" 
              stroke={CHART_COLORS[2]} 
              strokeWidth={3}
              name="Average EBITDA"
              dot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Role vs Performance - Scatter Plot */}
      <Card title="Investment Role vs Performance Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis 
              type="number" 
              dataKey="role" 
              name="Investment Role"
              domain={[0, 4]}
              ticks={[1, 2, 3]}
              tickFormatter={(value) => value === 1 ? 'Follow-on' : value === 2 ? 'Co-Investor' : 'Lead'}
            />
            <YAxis 
              type="number" 
              dataKey="performance" 
              name="ROI"
              tickFormatter={formatPercentage}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'ROI') {
                  return [formatPercentage(value as number), name];
                }
                if (name === 'Investment Role') {
                  const roleLabel = value === 1 ? 'Follow-on' : value === 2 ? 'Co-Investor' : 'Lead';
                  return [roleLabel, name];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${payload[0]?.payload?.name}`;
                }
                return label;
              }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <Scatter 
              name="Role vs Performance" 
              data={rolePerformanceData} 
              fill={CHART_COLORS[3]}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart (Regular Grid Item) */}
      <Card title="Portfolio Concentration by Investment Role" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={concentrationByRoleData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="role" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Valuation' || name === 'Average Valuation' || name === 'Total EBITDA') {
                  return [formatCurrency(value as number, 'EUR'), name];
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
              maxBarSize={60}
            />
            <Bar 
              yAxisId="right"
              dataKey="totalValuation" 
              fill={CHART_COLORS[1]} 
              name="Total Valuation"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Bar 
              yAxisId="right"
              dataKey="totalEbitda" 
              fill={CHART_COLORS[2]} 
              name="Total EBITDA"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="averageValuation" 
              stroke={CHART_COLORS[3]} 
              strokeWidth={3}
              name="Average Valuation"
              dot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Company Valuation Distribution - Full Width */}
      <div style={{ 
        gridColumn: '1 / -1', 
        marginTop: '24px'
      }}>
        <Card title="Company Valuation Distribution" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={valuationDistributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="range" 
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
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
                dataKey="count" 
                fill={CHART_COLORS[0]} 
                name="Company Count"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                yAxisId="right"
                dataKey="totalValuation" 
                fill={CHART_COLORS[1]} 
                name="Total Valuation"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="totalEbitda" 
                stroke={CHART_COLORS[2]} 
                strokeWidth={3}
                name="Total EBITDA"
                dot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}; 