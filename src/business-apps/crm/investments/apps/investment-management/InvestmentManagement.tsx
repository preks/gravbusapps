import React, { useState, useEffect } from "react";
import { PageLayout, Button } from "@newwork/nw-design-system";
import {
  TrendingDown,
  DollarSign,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import DivestmentView from "./views/divestment-view/DivestmentView";
import { InvestmentView } from "./views/investment-view";
import { navigateTo } from "@/common/utils/navigationUtils";
import DashboardView from "./views/dashboard-view/DashboardView";
import { AnalyticsView } from "./views/analytics-view";

export interface InvestmentManagementProps extends BusinessAppContextProps {}

export const InvestmentManagement: React.FC<InvestmentManagementProps> = (
  context
) => {
  const viewOptions = [
    {
      key: "dashboard",
      icon: <LayoutDashboard />,
      label: getTranslationFromI18nKeyAndLabel("portfolio", "Portfolio"),
    },
    {
      key: "investments",
      icon: <DollarSign />,
      label: getTranslationFromI18nKeyAndLabel("investments", "Investments"),
    },
    {
      key: "analytics",
      icon: <BarChart3 />,
      label: getTranslationFromI18nKeyAndLabel("analytics", "Analytics"),
    },
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

  // Investments subview handling (moved from InvestmentRelations)
  const getInitialInvestmentsSubView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subViewFromUrl = urlParams.get("subView");
    const valid = [
      "overview",
      "equity",
      "real-estate",
      "private-equity",
      "liquid-funds",
      "liquid-portfolio",
    ];
    if (subViewFromUrl && valid.includes(subViewFromUrl)) {
      return subViewFromUrl;
    }
    return "overview";
  };

  const [activeView, setActiveView] = useState<string>(getInitialView());
  const [investmentsSubTab, setInvestmentsSubTab] = useState<string>(
    getInitialInvestmentsSubView()
  );

  const handleNavigateToInvestments = (subTab?: string) => {
    setActiveView("investments");
    const targetSubTab = subTab || investmentsSubTab;
    setInvestmentsSubTab(targetSubTab);
    updateUrl("investments", targetSubTab);
  };

  // Update URL when view changes
  const updateUrl = (view: string, subView?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("view", view);
    if (view === "investments" && subView) {
      urlParams.set("subView", subView);
    } else if (urlParams.has("subView")) {
      urlParams.delete("subView");
    }
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleViewChange = (key: string) => {
    if (!key || key === activeView) {
      return;
    }
    setActiveView(key);
    if (key === "investments") {
      updateUrl(key, investmentsSubTab);
    } else {
      updateUrl(key);
    }
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view")) {
      let subView: string | undefined;
      if (activeView === "investments") {
        subView = investmentsSubTab;
      }
      updateUrl(activeView, subView);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveView(newView);
      if (newView === "investments") {
        const newInvestmentsSubView = getInitialInvestmentsSubView();
        setInvestmentsSubTab(newInvestmentsSubView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const renderViewContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <div data-testid="dashboard-view" className="gba:h-full gba:overflow-auto">
            <DashboardView
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              onNavigateToInvestments={handleNavigateToInvestments}
            />
          </div>
        );
      case "analytics":
        return (
          <div data-testid="analytics-view" className="gba:h-full gba:overflow-auto">
            <AnalyticsView {...context} />
          </div>
        );
      case "investments":
        return (
          <div data-testid="investments-view" className="gba:h-full gba:overflow-auto">
            <InvestmentView
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              initialSubTab={investmentsSubTab}
              onSubTabChange={(subTab) => {
                setInvestmentsSubTab(subTab);
                updateUrl("investments", subTab);
              }}
            />
          </div>
        );
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
        headerContent={
          <Button
            variant="default"
            onClick={() => navigateTo('/platform/irm/investment-relations')}
            data-testid="investment-management-navigate-to-relations-button"
          >
            Investment Relations
          </Button>
        }
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
