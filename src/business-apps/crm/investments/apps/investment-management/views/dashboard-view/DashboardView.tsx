import React from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { InvestmentTypesTab } from "./components";

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

  const handleNavigateToInvestmentType = (investmentType: string) => {
    // Navigate to the investments tab with the specific subtab
    if (onNavigateToInvestments) {
      onNavigateToInvestments(investmentType);
    }
  };

  return (
    <div data-testid="dashboard-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Portfolio</h1>
            <p className="gba:text-gray-600">Overview of all investments and portfolio metrics</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <InvestmentTypesTab
        accessToken={accessToken}
        userInfo={userInfo}
        onNavigateToInvestmentType={handleNavigateToInvestmentType}
      />
    </div>
  );
};

export default DashboardView;
