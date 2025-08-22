import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system';
import { BarChart3, TrendingUp } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { LiquidFundAnalytics } from './components/LiquidFundAnalytics';

export interface AnalyticsProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  accessToken,
  userInfo,
  initialSubTab = 'liquid-fund',
  onSubTabChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Update URL when tab changes
  useEffect(() => {
    const updateURL = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('analyticsSubView', activeSubTab);
      window.history.replaceState({}, '', url.toString());
    };

    updateURL();
    
    // Notify parent component of tab change
    if (onSubTabChange) {
      onSubTabChange(activeSubTab);
    }
  }, [activeSubTab, onSubTabChange]);

  const handleTabChange = (tabValue: string) => {
    setActiveSubTab(tabValue);
  };

  return (
    <div className="gba:h-full" data-testid="analytics-container">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="gba:h-full">
        <div className="gba:border-b gba:border-gray-200 gba:bg-white gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-6 gba:w-6" />
                Investment Analytics
              </h2>
              <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
                Analyze investment performance and portfolio metrics
              </p>
            </div>
          </div>
          
          <TabsList className="gba:mt-4 gba:grid gba:w-full gba:grid-cols-1 gba:max-w-md">
            <TabsTrigger 
              value="liquid-fund" 
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="liquid-fund-analytics-tab"
            >
              <TrendingUp className="gba:h-4 gba:w-4" />
              Liquid Fund
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="gba:flex-1 gba:overflow-auto">
          <TabsContent value="liquid-fund" className="gba:h-full gba:mt-0">
            <LiquidFundAnalytics
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid="liquid-fund-analytics"
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Analytics;