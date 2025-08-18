import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Card } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { MonthlySalaryForecast } from '../../../../../hooks/useMonthlySalaryForecast';

interface SalaryForecastChartProps {
  data: MonthlySalaryForecast[];
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="gba:bg-white gba:shadow-lg gba:rounded gba:p-4" data-testid="salary-forecast-tooltip">
        <div className="gba:font-semibold gba:text-base gba:mb-1">
          {d.month && new Date(d.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
        </div>
        <div className="gba:text-black gba:text-sm">
          <div><span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('salary_forecast_total_salary', 'Total Salary')}:</span> {formatCurrency(d.totalSalary)}</div>
          <div><span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('salary_forecast_headcount', 'Headcount')}:</span> {d.headcount}</div>
          <div className="gba:text-green-600"><span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('salary_forecast_new_hires', 'New Hires')}:</span> +{d.newHires}</div>
        </div>
      </div>
    );
  }
  return null;
};

const SalaryForecastChart: React.FC<SalaryForecastChartProps> = ({ data }) => {
  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6 gba:border gba:border-gray-200"
      data-testid="salary-forecast-chart-container"
      title={getTranslationFromI18nKeyAndLabel('salary_forecast_title', 'Company Salary Forecast')}
    >
      <div className="gba:text-gray-500 gba:text-sm gba:mb-4" data-testid="salary-forecast-description">
        {getTranslationFromI18nKeyAndLabel('salary_forecast_description', 'Total monthly salary expenses and growth trends')}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={month => new Date(month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
            className="gba:text-xs"
          />
          <YAxis
            tickFormatter={val => formatCurrency(val)}
            className="gba:text-xs"
            domain={[0, 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="totalSalary"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 8 }}
            name={getTranslationFromI18nKeyAndLabel('salary_forecast_total_salary', 'Total Salary')}
            data-testid="salary-forecast-line"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default SalaryForecastChart;
export { SalaryForecastChart };
