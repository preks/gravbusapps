import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import AllInvestmentsList from "./components/AllInvestmentsList";
import EquityInvestmentsList from "./components/EquityInvestmentsList";
import RealEstateInvestmentsList from "./components/RealEstateInvestmentsList";
import LiquidFundInvestmentsList from "./components/LiquidFundInvestmentsList";
import InvestmentStatistics from "./components/InvestmentStatistics";
import { LiquidPortfolioTab } from "./components";

export interface InvestmentViewProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const InvestmentView: React.FC<InvestmentViewProps> = (context) => {
  const { initialSubTab, onSubTabChange } = context as InvestmentViewProps;

  const normalize = useCallback((val?: string) => {
    const allowed = new Set([
      "overview",
      "equity",
      "real-estate",
      "private-equity",
      "liquid-funds",
      "liquid-portfolio",
    ]);
    if (!val) return "overview";
    return allowed.has(val) ? val : "overview";
  }, []);

  const [activeTab, setActiveTab] = useState(normalize(initialSubTab));

  useEffect(() => {
    setActiveTab(normalize(initialSubTab));
  }, [initialSubTab, normalize]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      onSubTabChange?.(value);
    },
    [onSubTabChange]
  );

  return (
    <div data-testid="investment-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Portfolio</h1>
            <p className="gba:text-gray-600">Manage and track investment portfolio across asset classes</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="gba:mb-6">
        <InvestmentStatistics {...context} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="liquid-funds">Liquid Fund</TabsTrigger>
          <TabsTrigger value="real-estate">Real Estate</TabsTrigger>
          <TabsTrigger value="equity">Equity</TabsTrigger>
          <TabsTrigger value="liquid-portfolio" data-testid="liquid-portfolio-tab">Liquid Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gba:mt-6">
          <AllInvestmentsList {...context} />
        </TabsContent>

        <TabsContent value="equity" className="gba:mt-6">
          <EquityInvestmentsList {...context} />
        </TabsContent>

        <TabsContent value="real-estate" className="gba:mt-6">
          <RealEstateInvestmentsList {...context} />
        </TabsContent>

        <TabsContent value="liquid-funds" className="gba:mt-6">
          <LiquidFundInvestmentsList {...context} />
        </TabsContent>

        <TabsContent value="liquid-portfolio" className="gba:mt-6">
          <LiquidPortfolioTab {...context} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestmentView;
