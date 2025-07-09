import React from 'react';
import { Card } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

interface PortfolioChartsProps {
  accountConcentrationData: any[];
  riskReturnData: any[];
  enhancedCurrencyData: any[];
}

export const LiquidFundPortfolioCharts: React.FC<PortfolioChartsProps> = ({ 
  accountConcentrationData, 
  riskReturnData, 
  enhancedCurrencyData 
}) => {
  return (
    <>
      {/* Portfolio Concentration by Account - Bar Chart */}
      <Card title="Portfolio Concentration by Account" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={accountConcentrationData.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              interval={0}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} funds`, 'Fund Count'];
                if (name === 'totalValue') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                if (name === 'avgInterestRate') return [`${(value as number).toFixed(2)}%`, 'Avg Interest Rate'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Fund Count" />
            <Line yAxisId="right" type="monotone" dataKey="totalValue" stroke="#82ca9d" strokeWidth={2} name="Total Value" />
            <Line yAxisId="left" type="monotone" dataKey="avgInterestRate" stroke="#ff7300" strokeWidth={2} name="Avg Interest Rate %" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Risk vs Return Analysis - Composed Chart */}
      <Card title="Risk vs Return Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={riskReturnData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <XAxis 
              dataKey="risk" 
              angle={-45}
              textAnchor="end"
              height={60}
              fontSize={10}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} funds`, 'Fund Count'];
                if (name === 'avgYield') return [`${(value as number).toFixed(2)}%`, 'Avg Yield'];
                if (name === 'totalValue') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Fund Count" />
            <Bar yAxisId="right" dataKey="avgYield" fill="#82ca9d" name="Avg Yield %" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Enhanced Currency Performance - Composed Chart */}
      <Card title="Currency Performance Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={enhancedCurrencyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <XAxis 
              dataKey="name" 
              fontSize={12}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} funds`, 'Fund Count'];
                if (name === 'value') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                if (name === 'avgInterestRate') return [`${(value as number).toFixed(2)}%`, 'Avg Interest Rate'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Fund Count" />
            <Line yAxisId="left" type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} name="Total Value" />
            <Line yAxisId="right" type="monotone" dataKey="avgInterestRate" stroke="#ff7300" strokeWidth={2} name="Avg Interest Rate %" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 