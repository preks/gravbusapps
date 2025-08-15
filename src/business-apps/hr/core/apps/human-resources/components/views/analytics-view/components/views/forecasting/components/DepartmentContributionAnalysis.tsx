import React from 'react';
import { Card, Spin } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDepartmentMonthlySalaryStack } from '../../../../hooks/useDepartmentMonthlySalaryStack';

interface DepartmentContributionAnalysisProps extends BusinessAppContextProps {}

const DepartmentContributionAnalysis: React.FC<DepartmentContributionAnalysisProps> = (props) => {
  const year = new Date().getFullYear();
  const { data, loading } = useDepartmentMonthlySalaryStack(props, year);
  if (loading) {
    return <Spin data-testid="department-contribution-analysis-loading" />;
  }
  if (!data.length) {
    return <div data-testid="department-contribution-analysis-empty">No data available</div>;
  }
  // Use first and last month for growth calculation
  const firstMonth = data[0];
  const lastMonth = data[data.length - 1];
  // Sort departments by salary descending for current month
  const sorted = [...lastMonth.departments].sort((a, b) => b.salary - a.salary);

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="department-contribution-analysis"
      title={getTranslationFromI18nKeyAndLabel('department_contribution_analysis', 'Department Contribution Analysis')}
    >
      <div className="gba:flex gba:flex-row gba:gap-16 gba:w-full gba:py-2">
        {/* Current Month Breakdown */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-gray-500 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('current_month_breakdown', 'Current Month Breakdown')}
          </div>
          {sorted.map(dep => (
            <div key={dep.id} className="gba:flex gba:items-center gba:mb-2" data-testid={`department-breakdown-${dep.id}`}> 
              <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2" style={{ background: dep.color }}></span>
              <span className="gba:w-32 gba:text-xs gba:text-gray-800">{dep.name}</span>
              <span className="gba:w-20 gba:text-right gba:font-medium">${(dep.salary/1e3).toFixed(0)}K</span>
              <span className="gba:w-12 gba:text-xs gba:text-gray-500 gba:text-right">{dep.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        {/* Growth Trends */}
        <div className="gba:w-1/2">
          <div className="gba:text-xs gba:text-gray-500 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('growth_trends', 'Growth Trends')}
          </div>
          {sorted.map(dep => {
            const first = firstMonth.departments.find(d => d.id === dep.id);
            const growth = first && first.salary > 0 ? ((dep.salary - first.salary) / first.salary) * 100 : 0;
            return (
              <div key={dep.id} className="gba:flex gba:items-center gba:mb-2" data-testid={`department-growth-${dep.id}`}> 
                <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2" style={{ background: dep.color }}></span>
                <span className="gba:w-32 gba:text-xs gba:text-gray-800">{dep.name}</span>
                <span className={`gba:w-20 gba:text-right gba:font-semibold ${growth >= 0 ? 'gba:text-green-600' : 'gba:text-red-600'}`}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
                <span className="gba:text-xs gba:text-gray-500 gba:ml-2">YTD {getTranslationFromI18nKeyAndLabel('growth', 'growth')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default DepartmentContributionAnalysis;
export { DepartmentContributionAnalysis };
