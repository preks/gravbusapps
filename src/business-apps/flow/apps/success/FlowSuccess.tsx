import React, { useEffect, useState } from 'react';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { TrendingUp, BarChart3, Shield, Timer, Workflow, AlertTriangle } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Components
import { OverviewTab } from './components/tabs/OverviewTab';
import { FlowTab } from './components/tabs/FlowTab';
import { TrendsTab } from './components/tabs/TrendsTab';
import { TaskPerformanceTab } from './components/tabs/TaskPerformanceTab';
import { AuditTab } from './components/tabs/AuditTab';
import { SLATab } from './components/tabs/SLATab';

interface FlowSuccessProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const FlowSuccess: React.FC<FlowSuccessProps> = ({
  prefixDataTestId = 'flow-success',
  accessToken,
  ...context
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Sync tab with URL hash (deep linking)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const valid = ['overview', 'flow', 'task-performance', 'sla', 'trends', 'audit'];
        if (valid.includes(hash)) {
          setActiveTab(hash);
        }
      }
    };

    applyHash();
    const handler = () => applyHash();
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

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
            <TabsList className="gba:grid gba:w-full gba:grid-cols-6 gba:bg-gray-50 gba:p-1 gba:rounded-none gba:rounded-t-lg">
              <TabsTrigger 
                value="overview" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-overview-tab`}
              >
                <BarChart3 className="gba:h-3 gba:w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="flow" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-flow-tab`}
              >
                <Workflow className="gba:h-3 gba:w-3" />
                Flows
              </TabsTrigger>
              <TabsTrigger 
                value="task-performance" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-task-performance-tab`}
              >
                <Timer className="gba:h-3 gba:w-3" />
                Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="sla" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-sla-tab`}
              >
                <AlertTriangle className="gba:h-3 gba:w-3" />
                SLA
              </TabsTrigger>

              <TabsTrigger 
                value="trends" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-trends-tab`}
              >
                <TrendingUp className="gba:h-3 gba:w-3" />
                Trends
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="gba:flex gba:items-center gba:gap-1 gba:py-3 gba:text-xs"
                data-testid={`${prefixDataTestId}-audit-tab`}
              >
                <Shield className="gba:h-3 gba:w-3" />
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

              <TabsContent value="flow" className="gba:mt-0">
                <FlowTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-flow`}
                  {...context}
                />
              </TabsContent>

              <TabsContent value="task-performance" className="gba:mt-0">
                <TaskPerformanceTab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-task-performance`}
                  {...context}
                />
              </TabsContent>

              <TabsContent value="sla" className="gba:mt-0">
                <SLATab
                  accessToken={accessToken}
                  prefixDataTestId={`${prefixDataTestId}-sla`}
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