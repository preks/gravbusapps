import React from 'react';
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext';
import { useWorkingConditionForecast } from '../../hooks/useWorkingConditionForecast';
import KpiCardsRow from '../forecasting/KpiCardsRow';
import { useMonthlySalaryForecast } from '../../hooks/useMonthlySalaryForecast';
import SalaryForecastChart from '../forecasting/SalaryForecastChart';
import HeadcountChangesChart from '../forecasting/HeadcountChangesChart';
import SalaryChangesChart from '../forecasting/SalaryChangesChart';
import DepartmentSalaryStackedBarChart from '../forecasting/DepartmentSalaryStackedBarChart';
import DepartmentContributionAnalysis from '../forecasting/DepartmentContributionAnalysis';

/**
 * Placeholder for the Forecasting tab content. We will build this step by step.
 */
const ForecastingTab: React.FC<BusinessAppContextProps> = (props) => {
  const kpiData = useWorkingConditionForecast(props);
  const year = new Date().getFullYear();
  const { data: monthlyData } = useMonthlySalaryForecast(props, year);

  return (
    <div data-testid="forecasting-tab-root" className="gba:p-6 gba:flex gba:flex-col gba:gap-6">
      <KpiCardsRow {...props} kpiData={kpiData} />
      <SalaryForecastChart data={monthlyData} />
      <HeadcountChangesChart {...props} />
      <SalaryChangesChart {...props} />
      <DepartmentSalaryStackedBarChart {...props} />
      <DepartmentContributionAnalysis {...props} />
    </div>
  );
};

export default ForecastingTab;
export { ForecastingTab };
