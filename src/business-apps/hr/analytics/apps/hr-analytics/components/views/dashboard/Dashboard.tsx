import React, { useState, useMemo } from "react";
import { Tabs, Typography, Spin } from "antd";
import {
  DashboardProps,
  AnalyticsKpiData,
  TabKey,
} from "./types/analyticsTypes";
import Overview from "./components/tabs/Overview";
import Workforce from "./components/tabs/Workforce";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useEmployeeCount } from "./hooks/useEmployeeCount";
import { useNewHiresCount } from "./hooks/useNewHiresCount";
import { useTurnoverRate } from "./hooks/useTurnoverRate";
import { useAverageSalary } from "./hooks/useAverageSalary";
import { useHiresPerYear } from "./hooks/useHiresPerYear";
import { useEmployeesPerYear } from "./hooks/useEmployeesPerYear";
import { useEmployeesByOrgUnit } from "./hooks/useEmployeesByOrgUnit";

const { Title, Text } = Typography;

/**
 * HR Analytics Dashboard component that displays various HR metrics and analytics across different tabs
 */
const Dashboard: React.FC<DashboardProps> = ({ accessToken }) => {
  // Keep all hook calls at the top level in a consistent order
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Get data from custom hooks
  const { count: employeeCount, loading: employeeLoading } =
    useEmployeeCount(accessToken);
  const { count: newHiresCount, loading: hiresLoading } =
    useNewHiresCount(accessToken);
  const {
    rate: turnoverRate,
    change: turnoverChange,
    loading: turnoverLoading,
  } = useTurnoverRate(accessToken, employeeCount);
  const { averageSalary, loading: salaryLoading } =
    useAverageSalary(accessToken);
  const {
    hiresData,
    loading: hiresYearlyLoading,
    error: hiresYearlyError,
  } = useHiresPerYear(accessToken);
  const {
    data: employeesYearlyData,
    loading: employeesYearlyLoading,
    error: employeesYearlyError,
  } = useEmployeesPerYear(accessToken);
  const {
    data: departmentData,
    loading: departmentLoading,
    error: departmentError,
  } = useEmployeesByOrgUnit(accessToken);

  // Combine loading states for simplicity
  const loading =
    employeeLoading ||
    hiresLoading ||
    turnoverLoading ||
    salaryLoading;

  // Format analytics KPI data
  const analyticsData: AnalyticsKpiData = useMemo(
    () => ({
      employeeCount: {
        value: employeeCount,
        label: getTranslationFromI18nKeyAndLabel(
          "hr_analytics_total_employees",
          "Total employees"
        ),
      },
      newHires: {
        value: newHiresCount,
        label: getTranslationFromI18nKeyAndLabel(
          "hr_analytics_new_hires",
          "New hires this year"
        ),
      },
      turnoverRate: {
        value: turnoverRate,
        change: turnoverChange,
        label: getTranslationFromI18nKeyAndLabel(
          "hr_analytics_turnover_rate",
          "Turnover rate"
        ),
      },
      averageSalary: {
        value: Math.round(averageSalary / 1000), // Convert to thousands
        label: getTranslationFromI18nKeyAndLabel(
          "hr_analytics_annual_average",
          "Annual average"
        ),
      },
    }),
    [employeeCount, newHiresCount, turnoverRate, turnoverChange, averageSalary]
  );

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
  };

  const tabItems = [
    {
      key: "overview",
      label: getTranslationFromI18nKeyAndLabel(
        "hr_analytics_tab_overview",
        "Overview"
      ),
      children: (
        <Overview
          analyticsData={analyticsData}
          hiresPerYearData={hiresData}
          hiresChartLoading={hiresYearlyLoading}
          hiresChartError={hiresYearlyError}
          employeesPerYearData={employeesYearlyData}
          employeesChartLoading={employeesYearlyLoading}
          employeesChartError={employeesYearlyError}
          departmentData={departmentData}
          departmentChartLoading={departmentLoading}
          departmentChartError={departmentError}
          accessToken={accessToken}
        />
      ),
    },
    {
      key: "workforce",
      label: getTranslationFromI18nKeyAndLabel(
        "hr_analytics_tab_workforce",
        "Workforce"
      ),
      children: <Workforce loading={loading} accessToken={accessToken} />,
    },
  ];

  return (
    <div
      className="gba:w-full gba:bg-white"
      data-testid="hr-analytics-dashboard"
    >
      <div className="gba:p-6 gba:pb-0">
        <div className="gba:mb-2">
          <Title level={2} className="gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              "hr_analytics_dashboard_title",
              "HR Analytics Dashboard"
            )}
          </Title>
          <Text className="gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel(
              "hr_analytics_dashboard_subtitle",
              "Comprehensive workforce insights and metrics"
            )}
          </Text>
        </div>
      </div>

      <div className="gba:ml-6 gba:mr-6">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="gba:mt-4"
          data-testid="hr-analytics-tabs"
        />
      </div>

      {loading && (
        <div
          className="gba:flex gba:justify-center gba:items-center gba:py-12"
          data-testid="hr-analytics-loading"
        >
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
