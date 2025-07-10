import React from 'react';
import { Card } from 'antd';
import { 
  ScatterChart,
  Scatter,
  ComposedChart,
  Bar,
  Line,
  BarChart,
  XAxis, 
  YAxis, 
 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { formatCurrency, formatPercentage, CHART_COLORS } from '../utils/formatters';

interface PortfolioAnalyticsChartsProps {
  sizeVsRoiData: any[];
  leverageAnalysisData: any[];
  riskReturnData: any[];
  concentrationByGroupData: any[];
  valueByAccountData: any[];
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  sizeVsRoiData,
  leverageAnalysisData,
  riskReturnData,
  concentrationByGroupData,
  valueByAccountData
}) => {
  return (
    <>
      {/* Investment Value by Account - Bar Chart - Full Width */}
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card title="Top Investment Accounts by Value" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={valueByAccountData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              maxBarSize={60}
            >
              <XAxis 
                dataKey="account" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value.length > 15) {
                    return value.substring(0, 12) + '...';
                  }
                  return value;
                }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0]?.payload;
                    const groups = data?.investmentGroups?.join(', ') || 'Unknown';
                    const types = data?.investmentTypes?.join(', ') || 'Unknown';
                    const value = payload[0]?.value;
                    
                    return (
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          Account: {label}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Investment Groups: {groups}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Investment Types: {types}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Number of Investments: {data?.count || 0}
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#06b6d4' }}>
                          Total Value: {formatCurrency(value as number, 'EUR')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                dataKey="totalValue" 
                fill="#06b6d4"
                name="Total Value"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Investment Size vs ROI Correlation - Scatter Plot */}
      <Card title="Investment Size vs ROI Correlation" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis 
              type="number" 
              dataKey="size" 
              name="Investment Size"
              tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')}
            />
            <YAxis 
              type="number" 
              dataKey="roi" 
              name="ROI"
              tickFormatter={(value) => formatPercentage(value / 100)}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Investment Size') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                if (name === 'ROI') {
                  return [formatPercentage(value as number / 100), name];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${payload[0]?.payload?.name} (${payload[0]?.payload?.type})`;
                }
                return label;
              }}
            />
            <Legend />
            <Scatter
              name="All Investments"
              data={sizeVsRoiData}
              fill={CHART_COLORS[0]}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Leverage vs Performance Analysis - Composed Chart */}
      <Card title="Leverage vs Performance Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={leverageAnalysisData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="leverageRange" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Value') {
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

      {/* Risk vs Return Analysis - Scatter Plot */}
      <Card title="Risk vs Return Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis 
              type="number" 
              dataKey="risk" 
              name="Risk Level"
              domain={[0, 4]}
              tickFormatter={(value) => {
                if (value === 1) return 'Low';
                if (value === 2) return 'Medium';
                if (value === 3) return 'High';
                return value;
              }}
            />
            <YAxis 
              type="number" 
              dataKey="return" 
              name="Return %"
              tickFormatter={(value) => formatPercentage(value / 100)}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Return %') {
                  return [formatPercentage(value as number / 100), name];
                }
                if (name === 'Risk Level') {
                  const riskLabels = { 1: 'Low', 2: 'Medium', 3: 'High' };
                  return [riskLabels[value as keyof typeof riskLabels] || value, name];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${payload[0]?.payload?.name} (${payload[0]?.payload?.type})`;
                }
                return label;
              }}
            />
            <Legend />
            <Scatter
              name="All Investments"
              data={riskReturnData}
              fill={CHART_COLORS[1]}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Portfolio Concentration Analysis - Composed Chart */}
      <Card title="Portfolio Concentration by Investment Group" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={concentrationByGroupData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <XAxis 
              dataKey="group" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Value' || name === 'Average Value') {
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
              dataKey="averageValue" 
              stroke={CHART_COLORS[2]} 
              strokeWidth={3}
              name="Average Value"
              dot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 