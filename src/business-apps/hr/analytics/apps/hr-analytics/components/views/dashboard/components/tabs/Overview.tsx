import React from 'react';
import { Card, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, UserOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AnalyticsKpiData } from '../../types/analyticsTypes';
import HiresPerYearChart from '../charts/HiresPerYearChart';
import EmployeesPerYearChart from '../charts/EmployeesPerYearChart';
import EmployeesByOrgUnitChart from '../charts/EmployeesByOrgUnitChart';
import { YearlyHireData } from '../../hooks/useHiresPerYear';
import { YearlyEmployeeData } from '../../hooks/useEmployeesPerYear';
import { OrgUnitEmployeeData } from '../../hooks/useEmployeesByOrgUnit';

const { Title, Text } = Typography;

interface OverviewTabProps {
  analyticsData: AnalyticsKpiData;
  hiresPerYearData: YearlyHireData[];
  hiresChartLoading: boolean;
  hiresChartError?: Error | null;
  employeesPerYearData: YearlyEmployeeData[];
  employeesChartLoading: boolean;
  employeesChartError?: Error | null;
  departmentData: OrgUnitEmployeeData[];
  departmentChartLoading: boolean;
  departmentChartError?: Error | null;
  accessToken: string;
}

const Overview: React.FC<OverviewTabProps> = ({ 
  analyticsData, 
  hiresPerYearData, 
  hiresChartLoading, 
  hiresChartError, 
  employeesPerYearData, 
  employeesChartLoading, 
  employeesChartError,
  accessToken
}) => {
  const {
    employeeCount,
    newHires,
    turnoverRate,
    averageSalary
  } = analyticsData;

  return (
    <div className="gba:w-full" data-testid="hr-analytics-overview-tab">
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-4">
        {/* Total Employees KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="total-employees-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UserOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {employeeCount.label}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="total-employees-value">
              {employeeCount.value.toLocaleString()}
            </Title>
            <Text className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_active_employees', 'Active employees')}
            </Text>
          </div>
        </Card>

        {/* New Hires KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="new-hires-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UserOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {newHires.label}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="new-hires-value">
              {newHires.value}
            </Title>
            <Text className="gba:text-gray-500" data-testid="new-hires-period">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_this_year', 'This year')}
            </Text>
          </div>
        </Card>

        {/* Turnover Rate KPI Card */}
        <Card 
          className="gba:h-full gba:shadow-sm"
          data-testid="turnover-rate-card"
        >
          <div className="gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <UserOutlined className="gba:text-gray-600" />
              <Text className="gba:text-gray-600">
                {turnoverRate.label}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="turnover-rate-value">
              {`${turnoverRate.value.toFixed(1)}%`}
            </Title>
            <div className="gba:flex gba:items-center gba:gap-1">
              {turnoverRate.change < 0 ? (
                <ArrowDownOutlined className="gba:text-green-500" />
              ) : (
                <ArrowUpOutlined className="gba:text-red-500" />
              )}
              <Text 
                className={`${turnoverRate.change < 0 ? 'gba:text-green-500' : 'gba:text-red-500'}`}
                data-testid="turnover-rate-change"
              >
                {`${turnoverRate.change > 0 ? '+' : ''}${turnoverRate.change.toFixed(1)}% ${getTranslationFromI18nKeyAndLabel('hr_analytics_vs_last_month', 'vs last month')}`}
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
                {averageSalary.label}
              </Text>
            </div>
            <Title level={2} className="gba:m-0 gba:mb-1" data-testid="avg-salary-value">
              {`$${averageSalary.value}K`}
            </Title>
            <Text className="gba:text-gray-500" data-testid="avg-salary-period">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_annual_average', 'Annual average')}
            </Text>
          </div>
        </Card>

      </div>
      
      {/* Charts Section */}
      <div className="gba:mt-8 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {/* Employees Per Year Chart */}
        <div className="gba:col-span-1" data-testid="employees-per-year-chart-container">
          <EmployeesPerYearChart data={employeesPerYearData} loading={employeesChartLoading} error={employeesChartError} />
        </div>
        
        {/* Hires Per Year Chart */}
        <div className="gba:col-span-1" data-testid="hires-per-year-chart-container">
          <HiresPerYearChart data={hiresPerYearData} loading={hiresChartLoading} error={hiresChartError} />
        </div>

        {/* Employees By Org Unit Chart */}
        <div className="gba:col-span-1 gba:md:col-span-2 gba:mt-4" data-testid="employees-by-org-unit-chart-container">
          <EmployeesByOrgUnitChart accessToken={accessToken} />
        </div>
      </div>
    </div>
  );
};

export default Overview;
