import React, { useMemo } from 'react';
import { Card, Empty, Result, Spin, Typography } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { MonthlyPayrollData } from '../../hooks/useMonthlyPayroll';

const { Title, Text } = Typography;

interface MonthlyPayrollChartProps {
  data: MonthlyPayrollData[];
  loading: boolean;
  error?: Error | null;
}

/**
 * Chart component displaying total payroll for the last 6 months as a bar chart
 */
const MonthlyPayrollChart: React.FC<MonthlyPayrollChartProps> = ({ data, loading, error }) => {
  // Format data for chart display
  const chartData = useMemo(() => {
    return data?.map(item => ({
      month: item.formattedMonth,
      payroll: item.monthlyPayroll,
      count: item.employeeCount
    })) || [];
  }, [data]);

  // Format y-axis values in millions (e.g., $1.2M)
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  // Format tooltip values
  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'payroll') {
      return [`$${value.toLocaleString()}`, 'Monthly Payroll'];
    }
    return [value.toLocaleString(), name];
  };

  return (
    <Card 
      className="gba:h-full gba:shadow-sm gba:mt-4" 
      data-testid="monthly-payroll-chart"
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} className="gba:m-0" data-testid="monthly-payroll-chart-title">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_monthly_payroll', 'Monthly Payroll (Last 6 Months)')}
          </Title>
          {chartData.length > 0 && (
            <Text className="gba:text-gray-500" data-testid="monthly-payroll-chart-count">
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_employee_count',
                `${chartData[chartData.length - 1]?.count || 0} employees`
              )}
            </Text>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-72" data-testid="monthly-payroll-chart-loading">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-72" data-testid="monthly-payroll-chart-error">
          <Result
            status="warning"
            title={getTranslationFromI18nKeyAndLabel('hr_analytics_data_error', 'Could not load data')}
            subTitle={error.toString().includes('CORS') ? 'API access blocked by CORS policy' : error.toString()}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-72" data-testid="monthly-payroll-chart-empty">
          <Empty description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')} />
        </div>
      ) : (
        <div className="gba:h-72" data-testid="monthly-payroll-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                tick={{ fill: '#666666', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                tick={{ fill: '#666666', fontSize: 12 }}
                width={60}
                tickFormatter={formatYAxis}
                label={{ 
                  value: getTranslationFromI18nKeyAndLabel('hr_analytics_chart_payroll', 'Payroll'),
                  angle: -90,
                  position: 'insideLeft',
                  dy: 40,
                  fill: '#666666',
                  fontSize: 12
                }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                formatter={formatTooltipValue}
                contentStyle={{ 
                  borderRadius: 4,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  padding: '8px 12px'
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: 5 }}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 20,
                  fontSize: 12,
                  color: '#666666'
                }}
                verticalAlign="bottom" 
                height={36}
              />
              <Bar 
                dataKey="payroll" 
                name={getTranslationFromI18nKeyAndLabel('hr_analytics_chart_monthly_payroll', 'Monthly Payroll')} 
                fill="#1890ff"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default MonthlyPayrollChart;
