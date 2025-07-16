import React, { useMemo } from 'react';
import { Card, Typography, Spin, Alert, Row, Col } from 'antd';
import { DollarOutlined, ArrowUpOutlined, TrophyOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useMedianSalary } from '../../hooks/useMedianSalary';
import { useTotalPayroll } from '../../hooks/useTotalPayroll';
import { useAverageSalary } from '../../hooks/useAverageSalary';
import { useSalaryByOrgUnit } from '../../hooks/useSalaryByOrgUnit';
import YearlyPayrollChart from '../charts/YearlyPayrollChart';
import SalaryByOrgUnitChart from '../charts/SalaryByOrgUnitChart';
import HealthInsurerDistributionChart from '../charts/HealthInsurerDistributionChart';
import HealthInsuranceTypeDistributionChart from '../charts/HealthInsuranceTypeDistributionChart';

const { Title, Text } = Typography;

interface CompensationTabProps extends BusinessAppContextProps {}

const CompensationTab: React.FC<CompensationTabProps> = ({ accessToken }) => {
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

  // Show error message if there was an error fetching data
  if (error) {
    return (
      <div className="gba:w-full gba:p-4" data-testid="hr-analytics-compensation-tab-error">
        <Alert
          message="Error"
          description={`Failed to load compensation data: ${error.message}`}
          type="error"
          showIcon
        />
      </div>
    );
  }
  
  return (
    <div className="gba:w-full" data-testid="hr-analytics-compensation-tab">
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-4">
        {/* Total Payroll KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="total-payroll-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <DollarOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_total_payroll', 'Total Payroll')}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="total-payroll-value">
              {loading ? (
                <Spin size="small" />
              ) : (
                `$${formattedTotalPayroll.value.toFixed(1)}M`
              )}
            </Title>
            <Text className="gba:text-gray-500" data-testid="total-payroll-label">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_annual_payroll', formattedTotalPayroll.label)}
            </Text>
          </div>
        </Card>

        {/* Median Salary KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="median-salary-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <DollarOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_median_salary', 'Median Salary')}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="median-salary-value">
              {loading ? (
                <Spin size="small" />
              ) : (
                `$${formattedMedianSalary.value}K`
              )}
            </Title>
            <div className="gba:flex gba:items-center gba:gap-1">
              <ArrowUpOutlined className="gba:text-green-500" />
              <Text className="gba:text-green-500" data-testid="median-salary-change">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_company_median', formattedMedianSalary.label)}
              </Text>
            </div>
          </div>
        </Card>

        {/* Average Salary KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="avg-salary-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <DollarOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_avg_salary', 'Avg Salary')}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="avg-salary-value">
              {loading ? (
                <Spin size="small" />
              ) : (
                `$${formattedAverageSalary.value}K`
              )}
            </Title>
            <Text className="gba:text-gray-500" data-testid="avg-salary-label">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', formattedAverageSalary.label)}
            </Text>
          </div>
        </Card>

        {/* Merit Increases KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="merit-increases-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <TrophyOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_merit_increases', 'Merit Increases')}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="merit-increases-value">
              {loading ? (
                <Spin size="small" />
              ) : (
                `${meritIncreases.value}%`
              )}
            </Title>
            <Text className="gba:text-gray-500" data-testid="merit-increases-label">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_average_increase', meritIncreases.label)}
            </Text>
          </div>
        </Card>
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

export default CompensationTab;
