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
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

interface PerformanceChartsProps {
  phaseValueData: any[];
  accountConcentrationData: any[];
  roiDistributionData: any[];
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ 
  phaseValueData, 
  accountConcentrationData, 
  roiDistributionData 
}) => {
  return (
    <>
      {/* Phase Performance - Bar Chart */}
      <Card title="Performance by Investment Phase" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={phaseValueData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={60}
              fontSize={10}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} investments`, 'Count'];
                if (name === 'avgROI') return [`${(value as number).toFixed(1)}%`, 'Avg ROI'];
                if (name === 'avgStake') return [`${(value as number).toFixed(1)}%`, 'Avg Stake'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Investment Count" />
            <Bar yAxisId="right" dataKey="avgROI" fill="#82ca9d" name="Avg ROI %" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Account Concentration - Bar Chart */}
      <Card title="Investment Concentration by Account" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={accountConcentrationData.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                if (name === 'count') return [`${value} investments`, 'Count'];
                if (name === 'totalValue') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Investment Count" />
            <Bar yAxisId="right" dataKey="totalValue" fill="#82ca9d" name="Total Value" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI Performance Ranking - Bar Chart */}
      <Card title="Top Investment Performance (ROI)" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roiDistributionData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              interval={0}
            />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'roi') return [`${(value as number).toFixed(1)}%`, 'ROI'];
                return [value, name];
              }}
            />
            <Bar 
              dataKey="roi" 
              fill="#82ca9d" 
              radius={[4, 4, 0, 0]}
              name="ROI %"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 