import React, { useState, useEffect } from "react";
import { PageLayout } from "@newwork/nw-design-system";
import {
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import DivestmentView from "./components/views/divestment-view/DivestmentView";

export interface InvestmentManagementProps extends BusinessAppContextProps {}

export const InvestmentManagement: React.FC<InvestmentManagementProps> = (
  context
) => {
  const viewOptions = [
    {
      key: "divestments",
      icon: <TrendingDown />,
      label: getTranslationFromI18nKeyAndLabel("divestments", "Divestments"),
    },
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get("view");

    if (
      viewFromUrl &&
      viewOptions.some((option) => option.key === viewFromUrl)
    ) {
      return viewFromUrl;
    }

    return viewOptions[0].key;
  };

  const [activeView, setActiveView] = useState<string>(getInitialView());

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("view", view);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleViewChange = (key: string) => {
    if (!key || key === activeView) {
      return;
    }
    setActiveView(key);
    updateUrl(key);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view")) {
      updateUrl(activeView);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveView(newView);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const renderViewContent = () => {
    switch (activeView) {
      case "divestments":
        return (
          <div data-testid="divestment-view" className="gba:h-full gba:overflow-auto">
            <DivestmentView {...context} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="investment-management-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: BarChart3,
          variant: "premium",
          size: "lg",
          label: getTranslationFromI18nKeyAndLabel("investment_management", "Investment Management"),
        }}
        headerTitle={getTranslationFromI18nKeyAndLabel("investment_management", "Investment Management")}
        headerDescription={getTranslationFromI18nKeyAndLabel("investment_management_description", "Comprehensive investment portfolio management and analysis tools")}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon,
          })),
        }}
        className="gba:min-h-screen"
      >
        {renderViewContent()}
      </PageLayout>
    </div>
  );
};

export default InvestmentManagement;
