import React, { useState, useEffect } from 'react';
import { Card, Typography, Tabs, Spin, Alert, Button } from 'antd';
import { ReloadOutlined, DashboardOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { PageLayout } from '@/components/layout/pageLayout';
import { PipelineSection } from './components/PipelineSection';
import { OverviewTab } from './components/OverviewTab';
import { PipelineDetailsTab } from './components/PipelineDetailsTab';
import { useSalesDashboard } from './hooks/useSalesDashboard';
import { PipelineInfo, DateRange } from './types/dashboardTypes';

const { Title } = Typography;

export interface SalesDashboardProps extends BusinessAppContextProps {}

export const SalesDashboard: React.FC<SalesDashboardProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    endDate: new Date() // Today
  });

  const {
    pipelines,
    isLoading,
    error,
    refetch
  } = useSalesDashboard(context, dateRange);

  const handleRefresh = () => {
    refetch();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  if (isLoading) {
    return (
      <div 
        data-testid="sales-dashboard-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen gba:bg-gradient-to-br gba:from-blue-50 gba:to-indigo-100"
      >
        <div className="gba:text-center">
          <Spin size="large" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
            Loading Sales Dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        data-testid="sales-dashboard-error"
        className="gba:min-h-screen gba:bg-gradient-to-br gba:from-red-50 gba:to-pink-100 gba:p-6 gba:flex gba:items-center gba:justify-center"
      >
        <div className="gba:max-w-lg gba:w-full">
          <Alert
            message="Error Loading Dashboard"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleRefresh} type="primary">
                Retry
              </Button>
            }
            className="gba:shadow-lg"
          />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <BarChartOutlined />
          <span>Overview</span>
        </div>
      ),
      children: (
        <OverviewTab
          pipelines={pipelines}
          dateRange={dateRange}
          {...context}
        />
      )
    },
    {
      key: 'pipelines',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PieChartOutlined />
          <span>Pipeline Details</span>
        </div>
      ),
      children: (
        <PipelineDetailsTab
          pipelines={pipelines}
          dateRange={dateRange}
          {...context}
        />
      )
    }
  ];

  return (
    <div data-testid="sales-dashboard">
      <PageLayout
        headerIcon={<DashboardOutlined />}
        headerLabel="Sales Dashboard"
        pageHeaderRight={
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:text-right gba:text-gray-600 gba:text-sm gba:hidden sm:gba:block">
              <div>Last updated</div>
              <div className="gba:font-medium">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <Button
              data-testid="sales-dashboard-refresh"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
            >
              <span className="gba:hidden sm:gba:inline">Refresh</span>
            </Button>
          </div>
        }

        contentContainer={
          <div className="gba:h-full gba:overflow-hidden">
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              size="large"
              className="gba:h-full"
              items={tabItems}
              tabBarStyle={{ marginBottom: 0 }}
            />
          </div>
        }
        className="gba:min-h-screen"
      />
    </div>
  );
};

export default SalesDashboard; 