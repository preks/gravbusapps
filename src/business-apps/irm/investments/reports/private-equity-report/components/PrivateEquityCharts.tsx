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
import { TimelineCharts } from './TimelineCharts';
import { PerformanceCharts } from './PerformanceCharts';
import { DistributionCharts } from './DistributionCharts';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87d068', '#ff9f7f', '#b19cd9'
];

interface PrivateEquityChartsProps {
  chartData: {
    roleData: any[];
    statusData: any[];
    phaseData: any[];
    riskLevelData: any[];
    currencyData: any[];
    valueOverTimeData: any[];
    roiData: any[];
    stakeData: any[];
    timelineData: any[];
    stakeValueData: any[];
    leverageData: any[];
    riskReturnData: any[];
    phaseValueData: any[];
    accountConcentrationData: any[];
    roiDistributionData: any[];
    activePeriodsData: any[];
  };
}

export const PrivateEquityCharts: React.FC<PrivateEquityChartsProps> = ({ chartData }) => {
  const {
    roleData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    valueOverTimeData,
    roiData,
    stakeData,
    timelineData,
    stakeValueData,
    leverageData,
    riskReturnData,
    phaseValueData,
    accountConcentrationData,
    roiDistributionData,
    activePeriodsData
  } = chartData;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      {/* Timeline and Analysis Charts */}
      <TimelineCharts 
        timelineData={timelineData}
        stakeValueData={stakeValueData}
        leverageData={leverageData}
        riskReturnData={riskReturnData}
      />

      {/* Performance Charts */}
      <PerformanceCharts 
        phaseValueData={phaseValueData}
        accountConcentrationData={accountConcentrationData}
        roiDistributionData={roiDistributionData}
      />

      {/* Distribution Charts */}
      <DistributionCharts 
        roleData={roleData}
        statusData={statusData}
        currencyData={currencyData}
        activePeriodsData={activePeriodsData}
      />

      {/* Legacy Charts - Keeping some original pie charts */}
      <Card title="Investment Phase Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={phaseData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {phaseData.map((_, index) => (
                <Cell key={`cell-phase-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} investments`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Risk Level Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskLevelData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {riskLevelData.map((_, index) => (
                <Cell key={`cell-risk-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} investments`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}; 