import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newwork/nw-design-system";
import {
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import PlannedExits from "./tabs/planned-exits";
import ExitOpportunities from "./tabs/exit-opportunities";
import Sales from "./tabs/sales";

export interface DivestmentViewProps extends BusinessAppContextProps {}

export const DivestmentView: React.FC<DivestmentViewProps> = (
  context
) => {
  const tabOptions = [
    {
      key: "planned-exits",
      icon: <TrendingDown className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel("planned_exits", "Planned Exits"),
    },
    {
      key: "exit-opportunities",
      icon: <DollarSign className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel("exit_opportunities", "Exit Opportunities"),
    },
    {
      key: "sales",
      icon: <DollarSign className="gba:w-4 gba:h-4" />,
      label: getTranslationFromI18nKeyAndLabel("sales", "Sales"),
    },
  ];

  // Get initial tab from URL or default to first tab
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");

    if (
      tabFromUrl &&
      tabOptions.some((option) => option.key === tabFromUrl)
    ) {
      return tabFromUrl;
    }

    return tabOptions[0].key;
  };

  // Get initial subView from URL for exit opportunities tab
  const getInitialExitOpportunitiesSubView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subViewFromUrl = urlParams.get("subView");

    if (subViewFromUrl === "pipeline") {
      return "board";
    } else if (subViewFromUrl === "list") {
      return "list";
    }

    return "list";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [exitOpportunitiesSubTab, setExitOpportunitiesSubTab] = useState<string>(
    getInitialExitOpportunitiesSubView()
  );

  // Update URL when tab changes
  const updateUrl = (tab: string, subView?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("tab", tab);

    if (tab === "exit-opportunities" && subView) {
      if (subView === "board") {
        urlParams.set("subView", "pipeline");
      } else if (subView === "list") {
        urlParams.set("subView", "list");
      }
    } else {
      if (urlParams.has("subView")) {
        urlParams.delete("subView");
      }
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleTabChange = (key: string) => {
    if (!key || key === activeTab) {
      return;
    }
    setActiveTab(key);

    if (key === "exit-opportunities") {
      updateUrl(key, exitOpportunitiesSubTab);
    } else {
      updateUrl(key);
    }
  };

  const handleExitOpportunitiesSubTabChange = (subTab: string) => {
    setExitOpportunitiesSubTab(subTab);
    updateUrl(activeTab, subTab);
  };

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("tab")) {
      let subView: string | undefined;
      if (activeTab === "exit-opportunities") {
        subView = exitOpportunitiesSubTab;
      }
      updateUrl(activeTab, subView);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);

      if (newTab === "exit-opportunities") {
        const newExitOpportunitiesSubView = getInitialExitOpportunitiesSubView();
        setExitOpportunitiesSubTab(newExitOpportunitiesSubView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div data-testid="divestment-relations-tabs" className="gba:h-full gba:flex gba:flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="gba:h-full gba:flex gba:flex-col"
      >
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
          {tabOptions.map((option) => (
            <TabsTrigger
              key={option.key}
              value={option.key}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`divestment-tab-${option.key}`}
            >
              {option.icon}
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="planned-exits"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="planned-exits-tab-content"
        >
          <div className="gba:p-6">
            <PlannedExits {...context} />
          </div>
        </TabsContent>

        <TabsContent
          value="exit-opportunities"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="exit-opportunities-tab-content"
        >
          <div className="gba:p-6">
            <ExitOpportunities
              {...context}
              initialSubTab={exitOpportunitiesSubTab}
              onSubTabChange={handleExitOpportunitiesSubTabChange}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="sales"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="sales-tab-content"
        >
          <div className="gba:p-6">
            <Sales {...context} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DivestmentView;
