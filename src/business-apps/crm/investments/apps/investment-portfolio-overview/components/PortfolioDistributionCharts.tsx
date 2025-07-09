import React from 'react';
import { Card } from 'antd';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercentage, renderCustomizedLabel, CHART_COLORS } from '../utils/formatters';

interface PortfolioDistributionChartsProps {
  investmentTypeData: any[];
  investmentGroupData: any[];
  statusData: any[];
  phaseData: any[];
  riskLevelData: any[];
  currencyData: any[];
  roiData: any[];
  roiDistributionData: any[];
}

export const PortfolioDistributionCharts: React.FC<PortfolioDistributionChartsProps> = ({
  investmentTypeData,
  investmentGroupData,
  statusData,
  phaseData,
  riskLevelData,
  currencyData,
  roiData,
  roiDistributionData
}) => {
  return (
    <>
      {/* Investment Type Distribution */}
      <Card title="Investment Type Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={investmentTypeData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
            >
              {investmentTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / investmentTypeData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Group Distribution */}
      <Card title="Investment Group Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={investmentGroupData.map(item => ({ ...item, name: item.type }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {investmentGroupData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} investments (${((value as number / investmentGroupData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
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

      {/* Currency Distribution */}
      <Card title="Investment Value by Currency" style={{ borderRadius: '8px' }}>
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
                formatCurrency(value as number, name as string),
                'Total Value'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI Distribution by Investment Group */}
      <Card title="ROI Distribution by Investment Group" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={roiData.map(item => ({ ...item, name: item.name }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="roi"
            >
              {roiData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${formatPercentage(value as number)} (${props.payload.count} investments)`,
                'Total ROI'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Enhanced ROI Performance Distribution */}
      <Card title="ROI Performance Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roiDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="range" 
              angle={-45}
              textAnchor="end"
              height={60}
              fontSize={11}
              tickFormatter={(value) => value.split(' (')[0]}
            />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Total Value') {
                  return [formatCurrency(value as number, 'EUR'), name];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Range: ${label}`}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              fill={CHART_COLORS[0]} 
              name="Investment Count"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}; 