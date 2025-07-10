import React, { useState } from 'react';
import { Tabs, TabsContent } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  DashboardHeader,
  DashboardNavigation,
  InvestmentTypesTab,
  AnalyticsTab
} from './components';

/**
 * Main dashboard component for IRM Investments management
 * Provides overview of all investments with filtering, sorting, and metrics
 */
const InvestmentsDashboard: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
}) => {
  const [activeTab, setActiveTab] = useState('investment-types');

  const handleInvestmentClick = (investmentId: string) => {
    window.location.href = `/platform/irm/investment-record?investmentId=${investmentId}`;
  };

  return (
    <div className="gba:min-h-screen gba:bg-gray-50" data-testid="investments-dashboard">
      {/* Header */}
      <DashboardHeader />

      {/* Navigation Tabs */}
      <DashboardNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="investment-types">
            <InvestmentTypesTab 
              accessToken={accessToken}
              userInfo={userInfo}
              onNavigateToInvestmentType={() => {}}
            />
          </TabsContent>



          <TabsContent value="analytics">
            <AnalyticsTab 
              accessToken={accessToken}
              userInfo={userInfo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InvestmentsDashboard;