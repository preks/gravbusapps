import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Clock, LineChart, PieChart } from 'lucide-react';

interface DashboardNavigationProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({ 
  activeTab, 
  setActiveTab 
}) => {
  return (
    <div className="gba:bg-white gba:border-b">
      <div className="gba:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:bg-transparent gba:border-0 gba:p-0 gba:h-auto">
            <TabsTrigger 
              value="investment-types" 
              className="gba:border-b-2 gba:border-transparent gba:rounded-none gba:px-4 gba:py-3 data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
              data-testid="investment-types-tab"
            >
              <Clock className="gba:h-4 gba:w-4 gba:mr-2" />
              Breakdown
            </TabsTrigger>

            <TabsTrigger 
              value="analytics" 
              className="gba:border-b-2 gba:border-transparent gba:rounded-none gba:px-4 gba:py-3 data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
              data-testid="analytics-tab"
            >
              <PieChart className="gba:h-4 gba:w-4 gba:mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardNavigation; 