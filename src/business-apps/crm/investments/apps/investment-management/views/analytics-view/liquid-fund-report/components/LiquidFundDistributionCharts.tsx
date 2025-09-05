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
// Note: This component uses its own COLORS array instead of shared chart utilities

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87d068', '#ff9f7f', '#b19cd9'
];

interface DistributionChartsProps {
  paymentFrequencyData: any[];
  earlyTerminationData: any[];
  statusData: any[];
  phaseData: any[];
  riskLevelData: any[];
  activePeriodsData: any[];
}

export const LiquidFundDistributionCharts: React.FC<DistributionChartsProps> = ({ 
  paymentFrequencyData, 
  earlyTerminationData, 
  statusData, 
  phaseData, 
  riskLevelData, 
  activePeriodsData 
}) => {
  return (
    <>
      {/* Interest Payment Frequency Distribution */}
      <Card title="Interest Payment Frequency" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={paymentFrequencyData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {paymentFrequencyData.map((_, index) => (
                <Cell key={`cell-frequency-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name, _props) => [
                `${value} funds (${((value as number / paymentFrequencyData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Early Termination Status Distribution */}
      <Card title="Early Termination Status" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={earlyTerminationData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {earlyTerminationData.map((_, index) => (
                <Cell key={`cell-termination-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name, _props) => [
                `${value} funds (${((value as number / earlyTerminationData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
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
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((_, index) => (
                <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name, _props) => [
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
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {phaseData.map((_, index) => (
                <Cell key={`cell-phase-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name, _props) => [
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
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {riskLevelData.map((_, index) => (
                <Cell key={`cell-risk-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name, _props) => [
                `${value} investments (${((value as number / riskLevelData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Active Investment Periods Distribution */}
      <Card title="Active Investment Periods" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={activePeriodsData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {activePeriodsData.map((_, index) => (
                <Cell key={`cell-periods-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, _name) => [
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