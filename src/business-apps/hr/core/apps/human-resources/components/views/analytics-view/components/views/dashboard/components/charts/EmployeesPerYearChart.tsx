import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty, Result } from 'antd';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { YearlyEmployeeData } from '../../../../../hooks/useEmployeesPerYear';

const { Title, Text } = Typography;

interface EmployeesPerYearChartProps {
  data: YearlyEmployeeData[];
  loading: boolean;
  error?: Error | null;
}

/**
 * Chart component displaying total employees per year as a bar chart with trend line
 */
const EmployeesPerYearChart: React.FC<EmployeesPerYearChartProps> = ({ data, loading, error }) => {
  // Ensure data is properly formatted and not empty
  const chartData = useMemo(() => {
    return data?.map(item => ({
      year: String(item.year),
      employees: item.count
    })) || [];
  }, [data]);
  
  // Prepare data for trend line
  const chartDataWithTrend = useMemo(() => {
    if (!chartData.length) return [];
    
    // Simple moving average to smooth the trend line
    return chartData.map((item, index, array) => {
      // For first point, use itself
      if (index === 0) {
        return { ...item, trend: item.employees };
      }
      
      // For last point, use itself
      if (index === array.length - 1) {
        return { ...item, trend: item.employees };
      }
      
      // For middle points, calculate weighted average
      const prevWeight = 0.25;
      const currWeight = 0.5;
      const nextWeight = 0.25;
      
      const weightedAvg = (
        (array[index-1].employees * prevWeight) +
        (item.employees * currWeight) +
        (array[index+1].employees * nextWeight)
      );
      
      return { ...item, trend: weightedAvg };
    });
  }, [chartData]);

  return (
    <Card 
      className="gba:w-full gba:mb-6 gba:shadow-sm" 
      data-testid="employees-per-year-chart"
    >
      {/* Header */}
      <div className="gba:mb-4">
        <Title level={4} className="gba:m-0 gba:text-gray-800">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_employees_per_year', 'Total Employees Per Year')}
        </Title>
        <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_employees_per_year_description', 'Company workforce growth trends with smoothed trend line showing organizational expansion over time')}
        </Text>
      </div>

      {/* Chart Content */}
      {loading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid="employees-per-year-chart-loading">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64" data-testid="employees-per-year-chart-error">
          <Result
            status="warning"
            title={getTranslationFromI18nKeyAndLabel('hr_analytics_data_error', 'Could not load data')}
            subTitle={error.toString().includes('CORS') ? 'API access blocked by CORS policy' : error.toString()}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid="employees-per-year-chart-empty">
          <Empty description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')} />
        </div>
      ) : (
        <div className="gba:h-64" data-testid="employees-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartDataWithTrend}
              margin={{ top: 15, right: 30, left: 20, bottom: 25 }}
              barSize={24}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                tick={{ fill: '#666666', fontSize: 12 }}
                dy={10}
                label={{ 
                  value: getTranslationFromI18nKeyAndLabel('hr_analytics_chart_year', 'Year'),
                  position: 'insideBottom',
                  offset: -15,
                  fill: '#666666',
                  fontSize: 12
                }} 
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                tick={{ fill: '#666666', fontSize: 12 }}
                width={60}
                label={{ 
                  value: getTranslationFromI18nKeyAndLabel('hr_analytics_chart_employees', 'Employees'),
                  angle: -90,
                  position: 'insideLeft',
                  dy: 50,
                  fill: '#666666',
                  fontSize: 12
                }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                contentStyle={{ 
                  borderRadius: 4,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  padding: '8px 12px'
                }}
                formatter={(value, name) => {
                  const label = name === 'trend' ? 'Trend' : 'Employees';
                  return [`${typeof value === 'number' ? value.toFixed(0) : value}`, label];
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
                dataKey="employees" 
                name={getTranslationFromI18nKeyAndLabel('hr_analytics_chart_employees', 'Employees')} 
                fill="#52c41a"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease"
              />
              <Line
                type="monotone"
                dataKey="trend"
                name="Trend"
                stroke="#333333"
                strokeWidth={2}
                dot={{ fill: '#333333', r: 4 }}
                activeDot={{ fill: '#333333', r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={2000}
                animationEasing="ease"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default EmployeesPerYearChart;
