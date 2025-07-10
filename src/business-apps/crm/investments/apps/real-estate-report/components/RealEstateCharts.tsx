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
  ScatterChart, 
  Scatter, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { formatCurrency, formatPercentage, renderCustomizedLabel, CHART_COLORS } from '../utils/formatters';

interface RealEstateChartsProps {
  chartData: {
    propertyTypeData: any[];
    countryData: any[];
    regionData: any[];
    occupancyData: any[];
    expensesValueData: any[];
    buildingYearData: any[];
    statusData: any[];
    phaseData: any[];
    riskLevelData: any[];
    currencyData: any[];
    propertySizeData: any[];
    timelineData: any[];
    leverageData: any[];
    roiSizeData: any[];
    ownershipStructureData: any[];
    performanceData: any[];
    geoValueData: any[];
  };
}

export const RealEstateCharts: React.FC<RealEstateChartsProps> = ({ chartData }) => {
  const {
    propertyTypeData,
    countryData,
    regionData,
    occupancyData,
    expensesValueData,
    buildingYearData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    propertySizeData,
    timelineData,
    leverageData,
    roiSizeData,
    ownershipStructureData,
    performanceData,
    geoValueData
  } = chartData;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      {/* Property Type Distribution - Pie Chart */}
      <Card title="Property Type Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={propertyTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {propertyTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} properties (${((value as number / propertyTypeData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Timeline - Line Chart */}
      <Card title="Investment Acquisition Timeline" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis yAxisId="left" tickFormatter={(value) => `${value}`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} acquisitions`, 'Properties Acquired'];
                if (name === 'value') return [formatCurrency(value as number, 'EUR'), 'Investment Value'];
                return [value, name];
              }}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Properties Acquired" />
            <Line yAxisId="right" type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} name="Investment Value" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Properties by Region - Area Chart */}
      <Card title="Properties by Region" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={regionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
            />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'value') return [`${value} properties`, 'Property Count'];
                if (name === 'totalValue') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                return [value, name];
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="value" stackId="1" stroke="#8884d8" fill="#8884d8" name="Property Count" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Property Size vs Value - Scatter Plot */}
      <Card title="Property Size vs Market Value" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={propertySizeData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="size" 
              name="Size"
              tickFormatter={(value) => `${value} sqm`}
            />
            <YAxis 
              type="number" 
              dataKey="value" 
              name="Market Value"
              tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '€')}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '10px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
                      <p style={{ margin: 0, color: '#8884d8' }}>
                        Size: {data.size} sqm
                      </p>
                      <p style={{ margin: 0, color: '#82ca9d' }}>
                        Value: {formatCurrency(data.value, 'EUR')}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Properties" fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Leverage Analysis - Composed Chart */}
      <Card title="Leverage Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={leverageData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              interval={0}
            />
            <YAxis yAxisId="left" tickFormatter={(value) => `${value}%`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'leverageRatio') return [`${value}%`, 'Leverage Ratio'];
                if (name === 'marketValue') return [formatCurrency(value as number, 'EUR'), 'Market Value'];
                if (name === 'debtFinancing') return [formatCurrency(value as number, 'EUR'), 'Debt Financing'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="leverageRatio" fill="#8884d8" name="Leverage Ratio %" />
            <Line yAxisId="right" type="monotone" dataKey="marketValue" stroke="#82ca9d" strokeWidth={2} name="Market Value" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI vs Size Analysis - Scatter with Colors */}
      <Card title="ROI vs Property Size Analysis" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={roiSizeData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="size" 
              name="Size"
              tickFormatter={(value) => `${value} sqm`}
            />
            <YAxis 
              type="number" 
              dataKey="roi" 
              name="ROI"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '10px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
                      <p style={{ margin: 0, color: '#8884d8' }}>
                        Size: {data.size} sqm
                      </p>
                      <p style={{ margin: 0, color: '#82ca9d' }}>
                        ROI: {data.roi}%
                      </p>
                      <p style={{ margin: 0, color: '#ffc658' }}>
                        Type: {data.propertyType}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Properties" fill="#ffc658" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Ownership Structure - Pie Chart */}
      <Card title="Ownership Structure Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={ownershipStructureData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {ownershipStructureData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} properties (${((value as number / ownershipStructureData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Occupancy Rate Distribution - Bar Chart */}
      <Card title="Occupancy Rate Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={occupancyData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={10}
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Occupancy Rate']}
            />
            <Bar dataKey="occupancy" fill="#8884d8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Geographic Value Density - Bar Chart */}
      <Card title="Geographic Value Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={geoValueData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <XAxis 
              dataKey="location" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              interval={0}
            />
            <YAxis yAxisId="left" tickFormatter={(value) => `${value}`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `€${(value / 1000000).toFixed(1)}M`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'count') return [`${value} properties`, 'Property Count'];
                if (name === 'totalValue') return [formatCurrency(value as number, 'EUR'), 'Total Value'];
                if (name === 'avgOccupancy') return [`${(value as number).toFixed(1)}%`, 'Avg Occupancy'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Property Count" />
            <Bar yAxisId="right" dataKey="totalValue" fill="#82ca9d" name="Total Value" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Annual Expenses vs Property Value - Scatter */}
      <Card title="Annual Expenses vs Property Value" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={expensesValueData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              type="number" 
              dataKey="value" 
              name="Property Value"
              tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '€')}
            />
            <YAxis 
              type="number" 
              dataKey="expenses" 
              name="Annual Expenses"
              tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '€')}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name, props) => {
                if (name === 'expenses') {
                  return [formatCurrency(value as number, props.payload?.currency || 'EUR'), 'Annual Expenses'];
                }
                if (name === 'value') {
                  return [formatCurrency(value as number, props.payload?.currency || 'EUR'), 'Property Value'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Property: ${label}`}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '10px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
                      <p style={{ margin: 0, color: '#8884d8' }}>
                        Market Value: {formatCurrency(data.value, data.currency)}
                      </p>
                      <p style={{ margin: 0, color: '#82ca9d' }}>
                        Annual Expenses: {formatCurrency(data.expenses, data.currency)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Properties" fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Building Year Distribution - Bar Chart */}
      <Card title="Building Year Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={buildingYearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Investment Status Distribution - Pie Chart */}
      <Card title="Investment Status Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
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
                `${value} properties (${((value as number / statusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                'Count'
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}; 