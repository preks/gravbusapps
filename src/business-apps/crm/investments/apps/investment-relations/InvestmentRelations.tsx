import React, { useState, useEffect } from "react";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@newwork/nw-design-system";
import {
  ToggleGroup,
  ToggleGroupItem,
  PageLayout,
} from "@newwork/nw-design-system";
import {
  DollarSign,
  Users,
  BarChart3,
  User,
  Building2,
  Contact as ContactIcon,
  LayoutDashboard,
  Grid3X3,
  List,
} from "lucide-react";
import { TrendUp } from "@phosphor-icons/react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { LeadList } from "@/business-apps/crm/common/components/lead-list";
import { AccountList } from "@/business-apps/crm/common/components/account-list";
import { ContactList } from "@/business-apps/crm/common/components/contact-list";
import { OpportunityList } from "@/business-apps/crm/common/components/opportunity-list";
import { OpportunityBoard } from "@/business-apps/crm/common/components/opportunity-board";
import InvestmentsDashboard from "./components/views/investments-dashboard/InvestmentsDashboard";
import { Investments } from "./components/views/investment-list";
import { Account } from "@/business-apps/crm/common/components/account-list/types";
import { Contact } from "@/business-apps/crm/common/components/contact-list/types";
import { Opportunity } from "@/business-apps/crm/common/components/opportunity-list/types";

export interface InvestmentRelationsProps extends BusinessAppContextProps {}

export const InvestmentRelations: React.FC<InvestmentRelationsProps> = (
  context
) => {
  const viewOptions = [
    {
      key: "dashboard",
      icon: <LayoutDashboard />,
      label: "Portfolio",
    },
    {
      key: "leads",
      icon: <Users />,
      label: "Leads",
    },
    {
      key: "accounts",
      icon: <Building2 />,
      label: "Accounts",
    },
    {
      key: "contacts",
      icon: <ContactIcon />,
      label: "Contacts",
    },
    {
      key: "opportunities",
      icon: <DollarSign />,
      label: "Opportunities",
    },
    {
      key: "investments",
      icon: <TrendUp />,
      label: "Investments",
    },
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get("view");

    // Validate that the view exists in our options
    if (
      viewFromUrl &&
      viewOptions.some((option) => option.key === viewFromUrl)
    ) {
      return viewFromUrl;
    }

    // Default to first view
    return viewOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  const [opportunitiesSubTab, setOpportunitiesSubTab] =
    useState<string>("list");
  const [investmentsSubTab, setInvestmentsSubTab] =
    useState<string>("overview");

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);

    // Always set the view parameter (including for default)
    urlParams.set("view", view);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleTabChange = (key: string) => {
    // Prevent deselection - if key is empty or same as current, ignore the change
    if (!key || key === activeTab) {
      return;
    }
    setActiveTab(key);
    updateUrl(key);
  };

  const handleNavigateToInvestments = (subTab?: string) => {
    // Switch to investments tab
    setActiveTab("investments");
    updateUrl("investments");

    // Set the specific subtab if provided
    if (subTab) {
      setInvestmentsSubTab(subTab);
    }
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view")) {
      updateUrl(activeTab);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveTab(newView);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const renderOpportunitiesContent = () => {
    return (
      <Tabs value={opportunitiesSubTab} onValueChange={setOpportunitiesSubTab}>
        <TabsList className="gba:mb-4">
          <TabsTrigger value="list" data-testid="opportunities-list-tab">
            <List className="gba:mr-2 gba:h-4 gba:w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="board" data-testid="opportunities-board-tab">
            <Grid3X3 className="gba:mr-2 gba:h-4 gba:w-4" />
            Board View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <OpportunityList {...context} sourceApp="IRM" />
        </TabsContent>
        <TabsContent value="board">
          <OpportunityBoard {...context} sourceApp="IRM" />
        </TabsContent>
      </Tabs>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div data-testid="dashboard-tab-content">
            <InvestmentsDashboard
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              onNavigateToInvestments={handleNavigateToInvestments}
            />
          </div>
        );
      case "investments":
        return (
          <div data-testid="investments-tab-content">
            <Investments
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              initialSubTab={investmentsSubTab}
              onSubTabChange={setInvestmentsSubTab}
            />
          </div>
        );
      case "leads":
        return (
          <div data-testid="leads-tab-content">
            <LeadList {...context} sourceApp="IRM" />
          </div>
        );
      case "accounts":
        return (
          <div data-testid="accounts-tab-content">
            <AccountList {...context} sourceApp="IRM" />
          </div>
        );
      case "contacts":
        return (
          <div data-testid="contacts-tab-content">
            <ContactList {...context} sourceApp="IRM" />
          </div>
        );
      case "opportunities":
        return renderOpportunitiesContent();
      default:
        return null;
    }
  };

  return (
    <div data-testid="investment-relations-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: TrendUp,
          variant: "premium",
          size: "lg",
          label: "Investment Relations",
        }}
        headerTitle="Investment Relations"
        headerDescription="Manage investment portfolios, client relationships, and track investment opportunities across asset classes"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon,
          })),
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  );
};

export default InvestmentRelations;
