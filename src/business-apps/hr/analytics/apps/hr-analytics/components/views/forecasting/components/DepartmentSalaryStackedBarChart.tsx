import React from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDepartmentMonthlySalaryStack } from '../../../../hooks/useDepartmentMonthlySalaryStack';

interface DepartmentSalaryStackedBarChartProps extends BusinessAppContextProps {}



const DepartmentSalaryStackedBarChart: React.FC<DepartmentSalaryStackedBarChartProps> = (props) => {
  const year = new Date().getFullYear();
  const { data, loading } = useDepartmentMonthlySalaryStack(props, year);
  const departments = data.length > 0 ? data[0].departments : [];

  // Prepare recharts data format
  const chartData = data.map(month => {
    const entry: any = { month: month.month, totalSalary: month.totalSalary };
    month.departments.forEach(dep => {
      entry[dep.id] = dep.salary;
    });
    return entry;
  });

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const idx = data.findIndex(m => m.month === payload[0].payload.month);
    const monthData = data[idx];
    if (!monthData) return null;
    const prev = idx > 0 ? data[idx - 1] : null;
    const totalChange = monthData.change;
    const totalChangePct = prev && prev.totalSalary ? (totalChange / prev.totalSalary) * 100 : 0;
    return (
      <div className="gba:bg-white gba:shadow-lg gba:rounded gba:p-4" data-testid="department-salary-tooltip">
        <div className="gba:font-semibold gba:text-base gba:mb-2">
          {monthData.month && new Date(monthData.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
        </div>
        <div className="gba:mb-2">
          <span className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('total_salary', 'Total Salary')}: </span>
          <span className="gba:font-bold gba:text-lg">${(monthData.totalSalary / 1e6).toFixed(2)}M</span>
          <span className="gba:text-red-600 gba:ml-2 gba:text-base">
            {totalChange < 0 ? `↓$${Math.abs(totalChange/1e3).toFixed(0)}K (${totalChangePct.toFixed(1)}%)` : ''}
          </span>
        </div>
        {monthData.departments.map(dep => {
          const depChange = dep.change;
          return (
            <div key={dep.id} className="gba:flex gba:items-center gba:mb-1">
              <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2" style={{ background: dep.color }}></span>
              <span className="gba:font-medium gba:mr-2">{dep.name}:</span>
              <span className="gba:mr-2">${(dep.salary/1e3).toFixed(0)}K</span>
              <span className="gba:text-gray-500 gba:text-xs gba:mr-2">{dep.percent.toFixed(1)}%</span>
              <span className="gba:text-red-600 gba:text-xs">
                {depChange < 0 ? `↓$${Math.abs(depChange/1e3).toFixed(0)}K` : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="department-salary-stacked-bar-chart"
      title={getTranslationFromI18nKeyAndLabel('department_salary_stacked_bar_chart', 'Department Salary Stacked Bar Chart')}
      loading={loading}
    >
      <div className="gba:w-full gba:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" className="gba:text-xs" />
            <YAxis className="gba:text-xs" tickFormatter={v => `$${(v/1e6).toFixed(1)}M`}/>
            <Tooltip content={<CustomTooltip />} />
            {departments.map(dep => (
              <Bar key={dep.id} dataKey={dep.id} stackId="a" fill={dep.color} name={dep.name} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default DepartmentSalaryStackedBarChart;
