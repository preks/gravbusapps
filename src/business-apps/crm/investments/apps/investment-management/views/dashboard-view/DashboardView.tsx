import React from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DashboardHeader, DashboardNavigation, InvestmentTypesTab } from "./components";

interface DashboardViewProps extends BusinessAppContextProps {
  onNavigateToInvestments?: (subTab?: string) => void;
}

/**
 * Main dashboard component for IRM Investments management
 * Provides overview of all investments with filtering, sorting, and metrics
 */
const DashboardView: React.FC<DashboardViewProps> = ({
  accessToken,
  userInfo,
  onNavigateToInvestments,
}) => {

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
      data-testid="dashboard-view"
    >
      {/* Header */}
      <DashboardHeader />

      {/* Navigation header retained; tabs removed */}
      <DashboardNavigation activeTab={"investment-types"} setActiveTab={() => {}} />

      {/* Main Content: Show breakdown content directly */}
      <div className="gba:p-6">
        <InvestmentTypesTab
          accessToken={accessToken}
          userInfo={userInfo}
          onNavigateToInvestmentType={handleNavigateToInvestmentType}
        />
      </div>
    </div>
  );
};

export default DashboardView;
