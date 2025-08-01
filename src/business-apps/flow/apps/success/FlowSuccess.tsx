import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { TrendingUp, Target, BarChart3, PieChart, Shield } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Components
import { OverviewTab } from './components/tabs/OverviewTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { TrendsTab } from './components/tabs/TrendsTab';
import { AuditTab } from './components/tabs/AuditTab';

interface FlowSuccessProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const FlowSuccess: React.FC<FlowSuccessProps> = ({
  prefixDataTestId = 'flow-success',
  accessToken,
  ...context
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div 
      className="gba:min-h-screen gba:bg-gradient-to-br gba:from-blue-50 gba:to-indigo-100 gba:p-6"
      data-testid={prefixDataTestId}
    >
      {/* Header */}
      <div className="gba:mb-8">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <div className="gba:p-3 gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:rounded-xl gba:shadow-lg">
            <TrendingUp className="gba:h-8 gba:w-8 gba:text-white" />
          </div>
          <div>
            <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900">
              FLOW Success
            </h1>
            <p className="gba:text-lg gba:text-gray-600">
              Workflow Outcomes & Performance Insights
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Card className="gba:shadow-xl gba:border-0 gba:bg-white/80 gba:backdrop-blur-sm">
        <CardContent className="gba:p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:bg-gray-50 gba:p-1 gba:rounded-none gba:rounded-t-lg">
              <TabsTrigger 
                value="overview" 
                className="gba:flex gba:items-center gba:gap-2 gba:py-3"
                data-testid={`${prefixDataTestId}-overview-tab`}
              >
                <BarChart3 className="gba:h-4 gba:w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="gba:flex gba:items-center gba:gap-2 gba:py-3"
                data-testid={`${prefixDataTestId}-analytics-tab`}
              >
                <PieChart className="gba:h-4 gba:w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="trends" 
                className="gba:flex gba:items-center gba:gap-2 gba:py-3"
                data-testid={`${prefixDataTestId}-trends-tab`}
              >
                <TrendingUp className="gba:h-4 gba:w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="gba:flex gba:items-center gba:gap-2 gba:py-3"
                data-testid={`${prefixDataTestId}-audit-tab`}
              >
                <Shield className="gba:h-4 gba:w-4" />
                Audit
              </TabsTrigger>
            </TabsList>

            <div className="gba:p-6">
              <TabsContent value="overview" className="gba:mt-0">
                <OverviewTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-overview`}
                  {...context}
                />
              </TabsContent>

              <TabsContent value="analytics" className="gba:mt-0">
                <AnalyticsTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-analytics`}
                  {...context}
                />
              </TabsContent>

              <TabsContent value="trends" className="gba:mt-0">
                <TrendsTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-trends`}
                  {...context}
                />
              </TabsContent>

              <TabsContent value="audit" className="gba:mt-0">
                <AuditTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-audit`}
                  {...context}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlowSuccess; 