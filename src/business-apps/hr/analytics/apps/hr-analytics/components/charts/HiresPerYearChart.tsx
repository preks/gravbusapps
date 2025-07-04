import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty, Result } from 'antd';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { YearlyHireData } from '../../hooks/useHiresPerYear';

const { Title } = Typography;

interface HiresPerYearChartProps {
  data: YearlyHireData[];
  loading: boolean;
  error?: Error | null;
}

/**
 * Chart component displaying hires per year as a bar chart with trend line
 */
const HiresPerYearChart: React.FC<HiresPerYearChartProps> = ({ data, loading, error }) => {
  // Ensure data is properly formatted and not empty
  const chartData = useMemo(() => {
    return data?.map(item => ({
      year: String(item.year),  // Convert to string for x-axis
      hires: item.count
    })) || [];
  }, [data]);
  
  // Prepare data for trend line
  const chartDataWithTrend = useMemo(() => {
    if (!chartData.length) return [];
    
    // Simple moving average to smooth the trend line
    return chartData.map((item, index, array) => {
      // For first point, use itself
      if (index === 0) {
        return { ...item, trend: item.hires };
      }
      
      // For last point, use itself
      if (index === array.length - 1) {
        return { ...item, trend: item.hires };
      }
      
      // For middle points, calculate weighted average
      const prevWeight = 0.25;
      const currWeight = 0.5;
      const nextWeight = 0.25;
      
      const weightedAvg = (
        (array[index-1].hires * prevWeight) +
        (item.hires * currWeight) +
        (array[index+1].hires * nextWeight)
      );
      
      return { ...item, trend: weightedAvg };
    });
  }, [chartData]);

  return (
    <Card 
      className="gba:h-full gba:shadow-sm" 
      data-testid="hires-per-year-chart"
      title={
        <Title level={4} className="gba:m-0" data-testid="hires-per-year-chart-title">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_hires_per_year', 'Hires Per Year')}
        </Title>
      }
    >
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hires-chart-loading">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-72" data-testid="hires-chart-error">
          <Result
            status="warning"
            title={getTranslationFromI18nKeyAndLabel('hr_analytics_data_error', 'Could not load data')}
            subTitle={error.toString().includes('CORS') ? 'API access blocked by CORS policy' : error.toString()}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hires-chart-empty">
          <Empty description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')} />
        </div>
      ) : (
        <div className="gba:h-64" data-testid="hires-chart-container">
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
                width={50}
                label={{ 
                  value: getTranslationFromI18nKeyAndLabel('hr_analytics_chart_hires', 'Hires'),
                  angle: -90,
                  position: 'insideLeft',
                  dy: 40,
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
                  const label = name === 'trend' ? 'Trend' : 'Hires';
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
                dataKey="hires" 
                name={getTranslationFromI18nKeyAndLabel('hr_analytics_chart_hires', 'Hires')} 
                fill="#1890ff"
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

export default HiresPerYearChart;
