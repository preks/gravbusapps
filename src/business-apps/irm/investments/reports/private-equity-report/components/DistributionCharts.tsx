import React from 'react';
import { Card } from 'antd';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87d068', '#ff9f7f', '#b19cd9'
];

interface DistributionChartsProps {
  roleData: any[];
  statusData: any[];
  currencyData: any[];
  activePeriodsData: any[];
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({ 
  roleData, 
  statusData, 
  currencyData, 
  activePeriodsData 
}) => {
  return (
    <>
      {/* Investment Role Distribution */}
      <Card title="Investment Role Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={roleData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {roleData.map((_, index) => (
                <Cell key={`cell-role-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [
                `${value} investments`,
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
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((_, index) => (
                <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [
                `${value} investments`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Currency Distribution */}
      <Card title="Currency Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={currencyData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, totalValue }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {currencyData.map((_, index) => (
                <Cell key={`cell-currency-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${formatCurrency(props.payload.totalValue, props.payload.name)})`,
                'Count & Value'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Active Investment Periods */}
      <Card title="Active Investment Periods" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={activePeriodsData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {activePeriodsData.map((_, index) => (
                <Cell key={`cell-periods-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [
                `${value} investments`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 