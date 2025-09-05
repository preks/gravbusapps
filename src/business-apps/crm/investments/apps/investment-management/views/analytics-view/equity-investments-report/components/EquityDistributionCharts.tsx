import React from 'react';
import { Card } from 'antd';
import {
  BarChart,
  ScatterChart,
  PieChart,
  Bar,
  Scatter,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/common/data/investment';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

// Custom label renderer for pie charts
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface EquityDistributionChartsProps {
  roleData: any[];
  statusData: any[];
  phaseData: any[];
  riskLevelData: any[];
  currencyData: any[];
  roiData: any[];
  ebitdaMarginData: any[];
  valuationEbitdaData: any[];
}

export const EquityDistributionCharts: React.FC<EquityDistributionChartsProps> = ({
  roleData,
  statusData,
  phaseData,
  riskLevelData,
  currencyData,
  roiData,
  ebitdaMarginData,
  valuationEbitdaData
}) => {
  return (
    <>
      {/* Investment Role Distribution */}
      <Card title="Investment Role Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={roleData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {roleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / roleData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Status Distribution */}
      <Card title="Investment Status Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / statusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Phase Distribution */}
      <Card title="Investment Phase Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={phaseData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {phaseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / phaseData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Risk Level Distribution */}
      <Card title="Risk Level Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskLevelData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {riskLevelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / riskLevelData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Currency Distribution and Company Valuation vs EBITDA - Side by Side */}
      <div style={{ 
        gridColumn: '1 / -1', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        marginTop: '24px'
      }}>
        {/* Currency Distribution */}
        <Card title="Currency Distribution by Value" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={currencyData.map(item => ({ ...item, name: item.type }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {currencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  formatCurrency(value as number, 'EUR'),
                  'Total Valuation'
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Company Valuation vs EBITDA Scatter */}
        <Card title="Company Valuation vs EBITDA" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              data={valuationEbitdaData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="valuation" 
                name="Valuation"
                tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')}
                label={{ value: 'Valuation', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="ebitda" 
                name="EBITDA"
                tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')}
                label={{ value: 'EBITDA', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Valuation' || name === 'EBITDA') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0]?.payload?.name;
                  }
                  return label;
                }}
              />
              <Scatter dataKey="ebitda" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ROI Distribution - Full Width */}
      <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
        <Card title="ROI Performance Distribution" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roiData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={10}
              />
              <YAxis 
                tickFormatter={(value) => formatPercentage(value)}
              />
              <Tooltip 
                formatter={(value) => [formatPercentage(value as number), 'ROI']}
              />
              <Bar 
                dataKey="roi" 
                fill="#ffc658"
                radius={[4, 4, 0, 0]}
              >
                {roiData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* EBITDA Margin Distribution - Full Width */}
      <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
        <Card title="EBITDA Margin Distribution" style={{ borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ebitdaMarginData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={10}
              />
              <YAxis 
                tickFormatter={(value) => formatPercentage(value)}
              />
              <Tooltip 
                formatter={(value) => [formatPercentage(value as number), 'EBITDA Margin']}
              />
              <Bar 
                dataKey="margin" 
                fill="#82ca9d"
                radius={[4, 4, 0, 0]}
              >
                {ebitdaMarginData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}; 