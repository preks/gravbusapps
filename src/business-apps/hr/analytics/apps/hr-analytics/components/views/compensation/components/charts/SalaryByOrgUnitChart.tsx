import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { OrganizationalUnitSalary } from '../../../../../hooks/useSalaryByOrgUnit';

const { Title, Text } = Typography;

interface SalaryByOrgUnitChartProps {
  data: OrganizationalUnitSalary[];
  loading?: boolean;
  error?: Error | null;
}

/**
 * Bar chart component to display average salary by organizational unit
 */
const SalaryByOrgUnitChart: React.FC<SalaryByOrgUnitChartProps> = ({
  data,
  loading = false,
  error = null
}) => {
  // Transform and sort data for the chart
  const chartData = useMemo(() => {
    const validData = data.filter(item => 
      typeof item.name === 'string' && 
      typeof item.averageSalary === 'number' && 
      !isNaN(item.averageSalary)
    );
    
    // Sort by average salary in descending order and limit to top 10
    const sortedData = [...validData].sort((a, b) => b.averageSalary - a.averageSalary).slice(0, 10);
    
    return sortedData.map(item => ({
      orgUnit: item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name,
      fullName: item.name,
      averageSalary: Math.round(item.averageSalary),
      employeeCount: item.employeeCount || 0
    }));
  }, [data]);

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="gba:bg-white gba:p-3 gba:rounded gba:shadow-lg gba:border">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Average Salary:</span> {formatCurrency(data.averageSalary)}
          </p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Employees:</span> {data.employeeCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className="gba:w-full gba:mb-6 gba:shadow-sm"
      data-testid="salary-by-org-unit-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_salary_by_org_unit', 'Average Salary by Organizational Unit')}
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_salary_by_org_unit_description', 'Average compensation levels across different organizational units showing pay distribution and departmental compensation patterns')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Text type="danger">{error.message}</Text>
        </div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Empty description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')} />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="orgUnit"
                type="category"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="averageSalary" 
                fill="#722ed1"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart footnote */}
      {!loading && !error && chartData && chartData.length > 0 && data.length > 10 && (
        <div className="gba:mt-4 gba:text-center gba:text-sm gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel(
            'hr_analytics_top_org_units_note', 
            `Showing top 10 org units out of ${data.length} total`
          )}
        </div>
      )}
    </Card>
  );
};

export default SalaryByOrgUnitChart;
