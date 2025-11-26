import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { 
  OverviewDashboard, 
  FlowAnalyticsDashboard, 
  TaskPerformanceDashboard, 
  EmployeeAnalyticsDashboard,
  TrendAnalyticsDashboard,
  ServiceDeskChartsDashboard,
  EmployeeDeskAnalyticsDashboard
} from './manager-analytics';

/**
 * Manager Analytics component for Service Desk performance metrics and reporting
 * Provides comprehensive insights into workflow performance, employee metrics, and operational analytics
 * Integrates with Custom Flow Engine analytics APIs for real-time data
 */
export interface AnalyticsProps extends BusinessAppContextProps {}

export const Analytics: React.FC<AnalyticsProps> = ({
  accessToken,
  userInfo,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  console.log('[Analytics] Rendering with activeTab:', activeTab);

  return (
    <div data-testid="manager-analytics" className="gba:min-h-screen">
      {/* Header Section */}
      <div className="gba:mb-6">
        <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'services.analytics.title',
            'Manager Analytics'
          )}
        </h2>
        <p className="gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            'services.analytics.description',
            'Comprehensive insights into team performance, workflow efficiency, and operational metrics.'
          )}
        </p>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-7">
          <TabsTrigger value="overview">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="flows">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.flows', 'Request Analytics')}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.tasks', 'Ticket Performance')}
          </TabsTrigger>
          <TabsTrigger value="employees">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.employees', 'Employee Analytics')}
          </TabsTrigger>
          <TabsTrigger value="trends">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.trends', 'Trends & Insights')}
          </TabsTrigger>
          <TabsTrigger value="charts">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.charts', 'Service Desk Charts')}
          </TabsTrigger>
          <TabsTrigger value="employee-desk">
            {getTranslationFromI18nKeyAndLabel('services.analytics.tabs.employeeDesk', 'Employee on Desk')}
          </TabsTrigger>
        </TabsList>

        {/* Conditionally render only the active tab to prevent duplicate API calls */}
        <div className="gba:mt-6">
          {activeTab === 'overview' && (
            <OverviewDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'flows' && (
            <FlowAnalyticsDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'tasks' && (
            <TaskPerformanceDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'employees' && (
            <EmployeeAnalyticsDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'trends' && (
            <TrendAnalyticsDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'charts' && (
            <ServiceDeskChartsDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
          {activeTab === 'employee-desk' && (
            <EmployeeDeskAnalyticsDashboard accessToken={accessToken} userInfo={userInfo} />
          )}
        </div>
      </Tabs>
    </div>
  );
};
