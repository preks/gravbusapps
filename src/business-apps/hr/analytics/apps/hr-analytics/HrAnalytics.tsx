import React, { useState, useMemo } from 'react';
import { Tabs, Typography, Spin } from 'antd';
import { HrAnalyticsProps, AnalyticsKpiData, TabKey } from './types/analyticsTypes';
import Overview from './components/tabs/Overview';
import EmployeeDemographics from './components/tabs/Employee.Demographics';
import CompensationTab from './components/tabs/Compensation';
import Workforce from './components/tabs/Workforce';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useEmployeeCount } from './hooks/useEmployeeCount';
import { useNewHiresCount } from './hooks/useNewHiresCount';
import { useTurnoverRate } from './hooks/useTurnoverRate';
import { useAverageSalary } from './hooks/useAverageSalary';
import { useHiresPerYear } from './hooks/useHiresPerYear';
import { useEmployeesPerYear } from './hooks/useEmployeesPerYear';

const { Title, Text } = Typography;

/**
 * HR Analytics Dashboard component that displays various HR metrics and analytics across different tabs
 */
const HrAnalytics: React.FC<HrAnalyticsProps> = ({ accessToken }) => {
  // Keep all hook calls at the top level in a consistent order
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  
  // Get data from custom hooks
  const { count: employeeCount, loading: employeeLoading } = useEmployeeCount(accessToken);
  const { count: newHiresCount, loading: hiresLoading } = useNewHiresCount(accessToken);
  const { rate: turnoverRate, change: turnoverChange, loading: turnoverLoading } = useTurnoverRate(accessToken, employeeCount);
  const { averageSalary, loading: salaryLoading } = useAverageSalary(accessToken);
  const { hiresData, loading: hiresYearlyLoading, error: hiresYearlyError } = useHiresPerYear(accessToken);
  const { data: employeesYearlyData, loading: employeesYearlyLoading, error: employeesYearlyError } = useEmployeesPerYear(accessToken);

  // Combine loading states
  const loading = employeeLoading || hiresLoading || turnoverLoading || salaryLoading || hiresYearlyLoading || employeesYearlyLoading;

  // Analytics data with real counts from API
  const analyticsData: AnalyticsKpiData = useMemo(() => ({
    totalEmployees: {
      value: employeeCount,
      change: 2.1,
      changeType: 'increase',
      period: getTranslationFromI18nKeyAndLabel('hr_analytics_last_month', 'last month')
    },
    newHires: {
      value: newHiresCount,
      period: getTranslationFromI18nKeyAndLabel('hr_analytics_this_month', 'This month')
    },
    turnoverRate: {
      value: turnoverRate,
      change: Math.abs(turnoverChange),
      changeType: turnoverChange < 0 ? 'decrease' : 'increase',
      period: getTranslationFromI18nKeyAndLabel('hr_analytics_last_month', 'last month')
    },
    avgSalary: {
      value: averageSalary,
      period: getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', 'Annual average')
    }
  }), [employeeCount, newHiresCount, turnoverRate, turnoverChange, averageSalary]);



  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
  };

  const tabItems = [
    {
      key: 'overview',
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_tab_overview', 'Overview'),
      children: <Overview 
        analyticsData={analyticsData} 
        hiresPerYearData={hiresData} 
        hiresChartLoading={hiresYearlyLoading}
        hiresChartError={hiresYearlyError}
        employeesPerYearData={employeesYearlyData}
        employeesChartLoading={employeesYearlyLoading}
        employeesChartError={employeesYearlyError}
      />
    },
    {
      key: 'demographics',
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_tab_demographics', 'Demographics'),
      children: <EmployeeDemographics loading={loading} accessToken={accessToken} />
    },
    {
      key: 'workforce',
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_tab_workforce', 'Workforce'),
      children: <Workforce loading={loading} accessToken={accessToken} />
    },
    {
      key: 'compensation',
      label: getTranslationFromI18nKeyAndLabel('hr_analytics_tab_compensation', 'Compensation'),
      children: <CompensationTab accessToken={accessToken} />
    }
  ];



  return (
    <div className="gba:w-full gba:bg-white" data-testid="hr-analytics-dashboard">
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-2">
          <Title level={2} className="gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_dashboard_title', 'HR Analytics Dashboard')}
          </Title>
          <Text className="gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_dashboard_subtitle', 'Comprehensive workforce insights and metrics')}
          </Text>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        className="gba:mt-4"
        data-testid="hr-analytics-tabs"
      />

      {loading && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="hr-analytics-loading">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default HrAnalytics;
