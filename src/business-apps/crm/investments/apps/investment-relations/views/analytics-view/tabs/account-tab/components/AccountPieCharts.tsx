import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AccountsAnalytics } from '../../../types/analyticsTypes';

interface AccountPieChartsProps {
  data: AccountsAnalytics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AccountPieCharts: React.FC<AccountPieChartsProps> = ({ data }) => {
  // Custom tooltip formatter functions that include percentages
  const createPieTooltipFormatter = (dataArray: any[], valueKey: string, labelKey: string) => {
    return (value: number, name: string, props: any) => {
      const total = dataArray?.reduce((sum, item) => sum + item[valueKey], 0) || 0;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return [`${value} (${percentage}%)`, props.payload[labelKey]];
    };
  };

  return (
    <div className="gba:flex gba:gap-4">
      {/* Accounts by Industry - Top 5 + Rest */}
      <Card data-testid="accounts-by-industry-chart" className="gba:flex-1 gba:w-1/2">
        <CardHeader>
          <CardTitle className="gba:text-lg">Accounts by Industry (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.accountsByIndustry}
                cx="50%"
                cy="40%"
                outerRadius={75}
                fill="#8884d8"
                dataKey="count"
                label={false}
              >
                {data.accountsByIndustry.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={createPieTooltipFormatter(data.accountsByIndustry, 'count', 'industry')} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                formatter={(value, entry) => `${(entry as any).payload.industry} (${(entry as any).payload.count})`}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Accounts by Company Size - Changed to Pie Chart */}
      <Card data-testid="accounts-by-size-chart" className="gba:flex-1 gba:w-1/2">
        <CardHeader>
          <CardTitle className="gba:text-lg">Accounts by Company Size</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.accountsBySize}
                cx="50%"
                cy="40%"
                outerRadius={75}
                fill="#8884d8"
                dataKey="count"
                label={false}
              >
                {data.accountsBySize.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={createPieTooltipFormatter(data.accountsBySize, 'count', 'sizeRange')} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                formatter={(value, entry) => `${(entry as any).payload.sizeRange} (${(entry as any).payload.count})`}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
export default AccountPieCharts;