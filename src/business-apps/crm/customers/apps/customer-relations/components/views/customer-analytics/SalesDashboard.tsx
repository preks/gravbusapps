import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system';
import { Spinner, PageLayout } from '@newwork/nw-design-system';
import { DashboardOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { PipelineSection } from './components/PipelineSection';
import { OverviewTab } from './components/OverviewTab';
import { PipelineDetailsTab } from './components/PipelineDetailsTab';
import { useSalesDashboard } from './hooks/useSalesDashboard';
import { PipelineInfo, DateRange } from './types/dashboardTypes';

export interface SalesDashboardProps extends BusinessAppContextProps {}

export const SalesDashboard: React.FC<SalesDashboardProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1), // Start of 2 years ago to include more data
    endDate: new Date() // Today
  });

  const {
    pipelines,
    isLoading,
    error,
    refetch
  } = useSalesDashboard(context, dateRange);

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
          <Spinner size="lg" />
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
          <Alert variant="destructive" className="gba:shadow-lg">
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sales-dashboard">
      <PageLayout
        headerTitle="Sales Dashboard"
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full">
            <TabsList className="gba:mb-0">
              <TabsTrigger value="overview">
                <BarChartOutlined className="gba:mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="pipelines">
                <PieChartOutlined className="gba:mr-2" />
                Pipeline Details
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="gba:h-full">
              <OverviewTab
                pipelines={pipelines}
                dateRange={dateRange}
                {...context}
              />
            </TabsContent>
            <TabsContent value="pipelines" className="gba:h-full">
              <PipelineDetailsTab
                pipelines={pipelines}
                dateRange={dateRange}
                {...context}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PageLayout>
    </div>
  );
};

export default SalesDashboard; 