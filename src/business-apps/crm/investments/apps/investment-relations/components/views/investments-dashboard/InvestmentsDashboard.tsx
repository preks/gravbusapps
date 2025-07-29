import React, { useState } from "react";
import { Tabs, TabsContent } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  DashboardHeader,
  DashboardNavigation,
  InvestmentTypesTab,
  AnalyticsTab,
} from "./components";

interface InvestmentsDashboardProps extends BusinessAppContextProps {
  onNavigateToInvestments?: (subTab?: string) => void;
}

/**
 * Main dashboard component for IRM Investments management
 * Provides overview of all investments with filtering, sorting, and metrics
 */
const InvestmentsDashboard: React.FC<InvestmentsDashboardProps> = ({
  accessToken,
  userInfo,
  onNavigateToInvestments,
}) => {
  const [activeTab, setActiveTab] = useState("investment-types");

  const handleInvestmentClick = (investmentId: string) => {
    window.location.href = `/platform/irm/investment-record?investmentId=${investmentId}`;
  };

  const handleNavigateToInvestmentType = (investmentType: string) => {
    // Navigate to the investments tab with the specific subtab
    if (onNavigateToInvestments) {
      onNavigateToInvestments(investmentType);
    }
  };

  return (
    <div
      className="gba:min-h-screen gba:bg-gray-50"
      data-testid="investments-dashboard"
    >
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
              onNavigateToInvestmentType={handleNavigateToInvestmentType}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab accessToken={accessToken} userInfo={userInfo} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InvestmentsDashboard;
