import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, Spinner, Card, CardContent } from '@newwork/nw-design-system';
import { PiTrendUp, PiArrowClockwise, PiUsers, PiChartBar } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import HeadcountTrends from './components/tabs/HeadcountTrends';
import TurnoverRetention from './components/tabs/TurnoverRetention';
import Performance from './components/tabs/Performance';
import { useHeadcountTrendsData } from './components/hooks/useHeadcountTrendsData';

interface WorkforceProps extends BusinessAppContextProps {}

const Workforce: React.FC<WorkforceProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('headcount-trends');
  
  const {
    statistics,
    isLoading,
    error,
    refetch
  } = useHeadcountTrendsData(context);

  const prefixDataTestId = 'Workforce';

  if (error) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-error`}
        className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
      >
        <Card className="gba:border-red-200 gba:bg-red-50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-red-900 gba:font-medium gba:mb-2">Failed to Load Workforce Data</h3>
                <p className="gba:text-red-700">{error}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={refetch}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiArrowClockwise />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        data-testid={`${prefixDataTestId}-loading`}
        className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center gba:flex-col"
      >
        <Spinner className="gba:w-8 gba:h-8" />
        <p className="gba:mt-4 gba:text-gray-600">
          Loading workforce data and analytics...
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="workforce-view"
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            Workforce Analytics
          </h2>
          <div className="gba:bg-white gba:px-3 gba:py-1 gba:rounded-full gba:border gba:border-gray-200">
            <span className="gba:font-semibold gba:text-blue-600">
              {statistics.totalEmployees} Employees
            </span>
          </div>
        </div>
        <Button 
          onClick={refetch}
          data-testid={`${prefixDataTestId}-refresh-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <PiArrowClockwise />
          Refresh Data
        </Button>
      </div>

      {/* Description */}
      <div className="gba:mb-6">
        <p className="gba:text-gray-600">
          Comprehensive workforce metrics, trends, and organizational insights
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gba:grid gba:w-full gba:max-w-4xl gba:grid-cols-3">
          <TabsTrigger 
            value="headcount-trends"
            data-testid="headcount-trends-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <PiTrendUp />
            Headcount Trends
          </TabsTrigger>
          <TabsTrigger 
            value="turnover-retention"
            data-testid="turnover-retention-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <PiUsers />
            Turnover & Retention
          </TabsTrigger>
          <TabsTrigger 
            value="performance"
            data-testid="performance-tab"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <PiChartBar />
            Performance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="headcount-trends" className="gba:mt-6">
          <HeadcountTrends {...context} />
        </TabsContent>
        
        <TabsContent value="turnover-retention" className="gba:mt-6">
          <TurnoverRetention {...context} />
        </TabsContent>
        
        <TabsContent value="performance" className="gba:mt-6">
          <Performance {...context} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Workforce; 