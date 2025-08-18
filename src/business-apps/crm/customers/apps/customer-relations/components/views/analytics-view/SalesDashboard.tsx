import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system';
import { ChartPie, Megaphone } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { PipelineDetailsTab } from './components/PipelineDetailsTab';
import { CampaignsAnalyticsTab } from './components/CampaignsAnalyticsTab';
import { useSalesDashboard } from './hooks/useSalesDashboard';
import { DateRange } from './types/dashboardTypes';

export interface SalesDashboardProps extends BusinessAppContextProps {}

export const SalesDashboard: React.FC<SalesDashboardProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('pipelines');
  const [dateRange] = useState<DateRange>({
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
        data-testid="analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen gba:bg-gradient-to-br gba:from-blue-50 gba:to-indigo-100"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
            Loading Analytics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        data-testid="analytics-error"
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
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full" data-testid="analytics-dashboard">
      <TabsList className="gba:mb-0">
        <TabsTrigger value="pipelines">
          <ChartPie className="gba:mr-2" />
          Pipeline Details
        </TabsTrigger>
        <TabsTrigger value="campaigns">
          <Megaphone className="gba:mr-2" />
          Campaigns
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pipelines" className="gba:h-full">
        <PipelineDetailsTab
          pipelines={pipelines}
          dateRange={dateRange}
          {...context}
        />
      </TabsContent>
      <TabsContent value="campaigns" className="gba:h-full">
        <CampaignsAnalyticsTab
          {...context}
        />
      </TabsContent>
    </Tabs>
  );
};

export default SalesDashboard; 