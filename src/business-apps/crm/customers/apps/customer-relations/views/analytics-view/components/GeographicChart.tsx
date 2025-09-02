import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GlobalOutlined } from '@ant-design/icons';
import { GeographicData } from '../hooks/useGeographicDistribution';
import { Spin } from 'antd';

interface GeographicChartProps {
  data: GeographicData[];
  isLoading?: boolean;
}

export const GeographicChart: React.FC<GeographicChartProps> = ({ data, isLoading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const getCountryColor = (index: number, total: number) => {
    const intensity = 1 - (index / total);
    return `hsl(210, 100%, ${Math.max(30, 90 - intensity * 40)}%)`;
  };

  // Calculate metrics for each country (account-focused)
  const enhancedData = data.slice(0, 5).map((country, index) => ({
    ...country,
    color: getCountryColor(index, 5), // Only 5 countries now
    shortName: country.country.length > 12 ? country.country.substring(0, 10) + '...' : country.country
  }));

  const totalAccounts = data.reduce((sum, country) => sum + country.accounts, 0);

  if (isLoading) {
    return (
      <Card data-testid="geographic-chart-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <GlobalOutlined />
            Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <Spin size="large" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card data-testid="geographic-chart-empty">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <GlobalOutlined />
            Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <GlobalOutlined className="gba:text-4xl gba:mb-4 gba:opacity-50" />
            <p className="gba:font-medium gba:mb-2">No geographic data available</p>
            <p className="gba:text-sm gba:max-w-md gba:mx-auto gba:leading-relaxed">
              Accounts need country information in their addresses or country references.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="geographic-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <GlobalOutlined />
          Top 5 Countries by Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          {/* Summary Stats */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-center gba:bg-gray-50 gba:p-2 gba:rounded-lg">
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{enhancedData.length}</div>
              <div className="gba:text-xs gba:text-gray-600">Countries</div>
            </div>
            <div>
              <div className="gba:text-sm gba:font-bold gba:text-gray-900">{totalAccounts}</div>
              <div className="gba:text-xs gba:text-gray-600">Accounts</div>
            </div>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="gba:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enhancedData}
                layout="horizontal"
                margin={{ top: 5, right: 15, left: 40, bottom: 5 }}
              >
                <XAxis 
                  type="number"
                  stroke="#6B7280"
                  fontSize={10}
                  tickFormatter={(value) => value.toString()}
                />
                <YAxis 
                  type="category"
                  dataKey="shortName"
                  stroke="#6B7280"
                  fontSize={10}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value, 'Accounts']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.country}`;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="accounts" radius={[0, 3, 3, 0]}>
                  {enhancedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};