import React, { useMemo } from 'react';
import { Typography, Row, Col } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system';
import { useMedianSalary } from './hooks/useMedianSalary';
import { useTotalPayroll } from './hooks/useTotalPayroll';
import { useAverageSalary } from './hooks/useAverageSalary';
import { useSalaryByOrgUnit } from './hooks/useSalaryByOrgUnit';
import YearlyPayrollChart from './components/charts/YearlyPayrollChart';
import SalaryByOrgUnitChart from './components/charts/SalaryByOrgUnitChart';
import HealthInsurerDistributionChart from './components/charts/HealthInsurerDistributionChart';
import HealthInsuranceTypeDistributionChart from './components/charts/HealthInsuranceTypeDistributionChart';

const { Title, Text } = Typography;

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const Compensation: React.FC<CompensationProps> = ({ 
  accessToken, 
  prefixDataTestId = 'Compensation' 
}) => {
  // Use separate hooks for each metric
  const { totalPayroll, loading: payrollLoading, error: payrollError } = useTotalPayroll(accessToken);
  const { medianSalary, loading: medianLoading, error: medianError } = useMedianSalary(accessToken);
  const { averageSalary, loading: avgSalaryLoading, error: avgSalaryError } = useAverageSalary(accessToken);
  const { salaryByOrgUnit, loading: salaryByOrgUnitLoading, error: salaryByOrgUnitError } = useSalaryByOrgUnit(accessToken);
  
  // Combine loading states
  const loading = payrollLoading || medianLoading || avgSalaryLoading;
  
  // Combine errors (show first one that occurs)
  const error = payrollError || medianError || avgSalaryError || salaryByOrgUnitError;
  
  // Default value for merit increases until we implement its hook
  const meritIncreases = useMemo(() => ({ value: 4.2, label: 'Average increase' }), []);
  
  // Format average salary in thousands
  const formattedAverageSalary = useMemo(() => {
    return {
      value: Math.round(averageSalary / 1000), // Convert to thousands and round
      label: 'Annual average'
    };
  }, [averageSalary]);
  
  // Format total payroll in millions
  const formattedTotalPayroll = useMemo(() => {
    return {
      value: totalPayroll / 1000000, // Convert to millions
      label: 'Annual payroll'
    };
  }, [totalPayroll]);
  
  // Format median salary in thousands
  const formattedMedianSalary = useMemo(() => {
    return {
      value: Math.round(medianSalary / 1000), // Convert to thousands and round
      label: 'Company median'
    };
  }, [medianSalary]);

  // Create KPI cards data
  const kpiCards: KpiCardData[] = useMemo(() => [
    {
      id: 'total-payroll',
      title: getTranslationFromI18nKeyAndLabel('hr_analytics_total_payroll', 'Total Payroll'),
      value: loading ? 'Loading...' : `${formattedTotalPayroll.value.toFixed(1)}M`,
      prefix: '$',
      icon: 'users',
      iconColor: '#1890ff',
      footer: getTranslationFromI18nKeyAndLabel('hr_analytics_annual_payroll', formattedTotalPayroll.label)
    },
    {
      id: 'median-salary',
      title: getTranslationFromI18nKeyAndLabel('hr_analytics_median_salary', 'Median Salary'),
      value: loading ? 'Loading...' : `${formattedMedianSalary.value}K`,
      prefix: '$',
      icon: 'users',
      iconColor: '#52c41a',
      footer: getTranslationFromI18nKeyAndLabel('hr_analytics_company_median', formattedMedianSalary.label)
    },
    {
      id: 'avg-salary',
      title: getTranslationFromI18nKeyAndLabel('hr_analytics_avg_salary', 'Avg Salary'),
      value: loading ? 'Loading...' : `${formattedAverageSalary.value}K`,
      prefix: '$',
      icon: 'users',
      iconColor: '#722ed1',
      footer: getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', formattedAverageSalary.label)
    },
    {
      id: 'merit-increases',
      title: getTranslationFromI18nKeyAndLabel('hr_analytics_merit_increases', 'Merit Increases'),
      value: loading ? 'Loading...' : `${meritIncreases.value}%`,
      icon: 'calendar',
      iconColor: '#fa8c16',
      footer: getTranslationFromI18nKeyAndLabel('hr_analytics_average_increase', meritIncreases.label)
    }
  ], [loading, formattedTotalPayroll, formattedMedianSalary, formattedAverageSalary, meritIncreases]);
  
  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-Error`}
        className="gba:p-6"
      >
        <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg gba:p-4">
          <h3 className="gba:text-red-800 gba:font-medium">Error Loading Compensation Data</h3>
          <p className="gba:text-red-600 gba:mt-2">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid={prefixDataTestId}
      className="gba:flex gba:flex-col gba:gap-6 gba:p-6"
      style={{
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <Title level={3} className="gba:m-0 gba:text-gray-800">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_compensation_analysis', 'Compensation Analysis')}
          </Title>
          <Text className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_compensation_description', 'Comprehensive compensation metrics, salary analysis, and payroll insights')}
          </Text>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-cards`}>
        <SectionKpiCards cards={kpiCards} />
      </div>
      
      {/* Yearly Payroll Chart */}
      <YearlyPayrollChart
        accessToken={accessToken}
      />
      
      {/* Average Salary by Org Unit Chart */}
      <SalaryByOrgUnitChart
        data={salaryByOrgUnit}
        loading={salaryByOrgUnitLoading}
        error={salaryByOrgUnitError}
      />
      
      {/* Health Insurance Charts */}
      <div className="gba:mt-4">
        <Row gutter={16} className="gba:w-full">
          <Col span={12}>
            <HealthInsurerDistributionChart
              accessToken={accessToken}
            />
          </Col>
          <Col span={12}>
            <HealthInsuranceTypeDistributionChart
              accessToken={accessToken}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Compensation; 