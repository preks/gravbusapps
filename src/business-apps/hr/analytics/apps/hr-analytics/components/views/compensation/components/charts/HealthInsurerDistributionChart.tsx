import React from 'react';
import { Typography, Spin, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useHealthInsuranceDistribution } from '../../hooks/useHealthInsuranceDistribution';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Title, Text } = Typography;

/**
 * Pie chart component for displaying health insurer distribution
 */
export const HealthInsurerDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { distribution: data, loading, error } = useHealthInsuranceDistribution(accessToken);

  // Color palette for pie chart segments
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Format data for the pie chart
  const chartData = data.map((item: any, index: number) => ({
    name: item.name,
    value: item.count,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length]
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="gba:bg-white gba:p-3 gba:rounded gba:shadow-lg gba:border">
          <p className="gba:font-semibold gba:mb-1">{data.payload.name}</p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Employees:</span> {data.value.toLocaleString()}
          </p>
          <p className="gba:text-sm">
            <span className="gba:font-medium">Percentage:</span> {data.payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="gba:w-full gba:h-full gba:bg-white gba:rounded-lg gba:p-6 gba:shadow-sm gba:border gba:border-gray-200"
      data-testid="health-insurer-distribution-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_health_insurer_distribution', 'Health Insurer Distribution')}
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_health_insurer_distribution_description', 'Distribution of employees across different health insurance providers showing coverage preferences and provider market share')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Text type="danger">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_error_loading_data', 'Error loading health insurer data')}
          </Text>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Empty 
            description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
          />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name} (${percentage}%)`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: any, entry: any) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HealthInsurerDistributionChart;
