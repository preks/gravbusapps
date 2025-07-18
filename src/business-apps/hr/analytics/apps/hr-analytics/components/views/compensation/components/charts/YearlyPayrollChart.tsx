import React from 'react';
import { Card, Spin, Typography, Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useYearlyPayroll } from '../../../../../hooks/useYearlyPayroll';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Title, Text } = Typography;

/**
 * Props for the YearlyPayrollChart component
 */
interface YearlyPayrollChartProps extends BusinessAppContextProps {}

/**
 * A bar chart component that displays the yearly payroll data for the last 5 years
 */
const YearlyPayrollChart: React.FC<YearlyPayrollChartProps> = ({ accessToken }) => {
  // Fetch yearly payroll data
  const { data, loading, error } = useYearlyPayroll(accessToken);
  
  console.log('[YearlyPayrollChart] Rendering chart with data:', data);
  
  // Format currency values for tooltip display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Custom tooltip formatter
  const tooltipFormatter = (value: number) => {
    return formatCurrency(value);
  };
  
  return (
    <Card 
      className="gba:w-full gba:mb-6 gba:shadow-sm"
      data-testid="hr-analytics-yearly-payroll-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_yearly_payroll_chart_title', 'Total Payroll by Year')}
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_yearly_payroll_description', 'Annual payroll expenditure trends showing total compensation costs across the organization')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-96">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
          <Text type="danger">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_yearly_payroll_error', 
              'Error loading yearly payroll data'
            )}
          </Text>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-96">
          <Empty 
            description={getTranslationFromI18nKeyAndLabel(
              'hr_analytics_yearly_payroll_no_data', 
              'No yearly payroll data available'
            )}
          />
        </div>
      ) : (
        <div className="gba:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 30
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year"
                name="Year"
              />
              <YAxis
                name="Total Payroll"
                tickFormatter={tooltipFormatter}
              />
              <Tooltip 
                formatter={tooltipFormatter} 
                labelFormatter={(label) => `Year: ${label}`} 
              />
              <Legend />
              <Bar 
                name={getTranslationFromI18nKeyAndLabel('hr_analytics_total_payroll', 'Total Payroll')} 
                dataKey="totalPayroll" 
                fill="#8884d8"
                barSize={38}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default YearlyPayrollChart;
