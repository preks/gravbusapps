import React, { useState, useEffect } from "react";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertTitle,
  AlertDescription
} from "@newwork/nw-design-system";
import { Spinner } from "@newwork/nw-design-system";
import { PageLayout } from "@newwork/nw-design-system";
import {
  DashboardOutlined,
  BarChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  BankOutlined,
  ContactsOutlined,
  DollarCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { Handshake } from "@phosphor-icons/react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { LeadList } from "@/business-apps/crm/common/components/lead-list";
import { AccountList } from "@/business-apps/crm/common/components/account-list";
import { ContactList } from "@/business-apps/crm/common/components/contact-list";
import { OpportunityList } from "@/business-apps/crm/common/components/opportunity-list";
import { OpportunityBoard } from "@/business-apps/crm/common/components/opportunity-board";
import { OverviewTab } from "./components/views/customer-analytics/components/OverviewTab";
import { PipelineDetailsTab } from "./components/views/customer-analytics/components/PipelineDetailsTab";
import { useSalesDashboard } from "./components/views/customer-analytics/hooks/useSalesDashboard";
import { DateRange } from "./components/views/customer-analytics/types/dashboardTypes";

export interface CustomerRelationsProps extends BusinessAppContextProps {}

export const CustomerRelations: React.FC<CustomerRelationsProps> = (
  context
) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: "Dashboard"
    },
    {
      key: "leads",
      icon: <TeamOutlined />,
      label: "Leads"
    },
    {
      key: "accounts",
      icon: <BankOutlined />,
      label: "Accounts"
    },
    {
      key: "contacts",
      icon: <ContactsOutlined />,
      label: "Contacts"
    },
    {
      key: "opportunities",
      icon: <DollarCircleOutlined />,
      label: "Opportunities"
    },
    {
      key: "analytics",
      icon: <DashboardOutlined />,
      label: "Analytics"
    }
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

  // Get initial subView from URL for opportunities tab
  const getInitialSubView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subViewFromUrl = urlParams.get("subView");

    // Map URL subView values to internal tab values
    if (subViewFromUrl === "pipeline") {
      return "board";
    } else if (subViewFromUrl === "list") {
      return "list";
    }

    // Default to list view
    return "list";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  const [dashboardSubTab, setDashboardSubTab] = useState<string>("overview");
  const [opportunitiesSubTab, setOpportunitiesSubTab] =
    useState<string>(getInitialSubView());
  const [dateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1),
    endDate: new Date()
  });
  const { pipelines, isLoading, error, refetch } = useSalesDashboard(
    context,
    dateRange
  );

  // Update URL when view changes
  const updateUrl = (view: string, subView?: string) => {
    const urlParams = new URLSearchParams(window.location.search);

    // Always set the view parameter (including for default)
    urlParams.set("view", view);

    // Handle subView parameter for opportunities
    if (view === "opportunities" && subView) {
      // Map internal tab values to URL subView values
      if (subView === "board") {
        urlParams.set("subView", "pipeline");
      } else if (subView === "list") {
        urlParams.set("subView", "list");
      }
    } else {
      // Clear subView parameter when not in opportunities view
      if (urlParams.has("subView")) {
        urlParams.delete("subView");
      }
    }

    // Clear leadStatus parameter when switching away from leads view
    if (view !== "leads" && urlParams.has("leadStatus")) {
      urlParams.delete("leadStatus");
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const handleTabChange = (key: string) => {
    // Allow all valid tab changes including clicking the same tab to ensure proper highlighting
    if (!key) {
      return;
    }
    setActiveTab(key);
    
    // If switching to opportunities, include current subView in URL
    if (key === "opportunities") {
      updateUrl(key, opportunitiesSubTab);
    } else {
      updateUrl(key);
    }
  };

  const handleOpportunitiesSubTabChange = (subTab: string) => {
    setOpportunitiesSubTab(subTab);
    // Update URL with new subView when tab changes
    updateUrl(activeTab, subTab);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view")) {
      updateUrl(activeTab, activeTab === "opportunities" ? opportunitiesSubTab : undefined);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      const newSubView = getInitialSubView();
      setActiveTab(newView);
      setOpportunitiesSubTab(newSubView);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spinner size="lg" />
            <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
              Loading Customer Relations Dashboard...
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="gba:p-6">
          <Alert variant="destructive" className="gba:shadow-sm">
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      );
    }

    return (
      <Tabs value={dashboardSubTab} onValueChange={setDashboardSubTab}>
        <TabsList className="gba:mb-4">
          <TabsTrigger value="overview" data-testid="overview-tab">
            <BarChartOutlined className="gba:mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pipelines" data-testid="pipelines-tab">
            <PieChartOutlined className="gba:mr-2" />
            Pipeline Details
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab
            pipelines={pipelines}
            dateRange={dateRange}
            {...context}
          />
        </TabsContent>
        <TabsContent value="pipelines">
          <PipelineDetailsTab
            pipelines={pipelines}
            dateRange={dateRange}
            {...context}
          />
        </TabsContent>
      </Tabs>
    );
  };

  const renderOpportunitiesContent = () => {
    return (
      <Tabs value={opportunitiesSubTab} onValueChange={handleOpportunitiesSubTabChange}>
        <TabsList className="gba:mb-4">
          <TabsTrigger value="list" data-testid="opportunities-list-tab">
            <UnorderedListOutlined className="gba:mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="board" data-testid="opportunities-board-tab">
            <AppstoreOutlined className="gba:mr-2" />
            Board View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <OpportunityList {...context} sourceApp="CRM" />
        </TabsContent>
        <TabsContent value="board">
          <OpportunityBoard {...context} sourceApp="CRM" />
        </TabsContent>
      </Tabs>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboardContent();
      case "leads":
        return (
          <div data-testid="leads-tab-content">
            <LeadList {...context} sourceApp="CRM" />
          </div>
        );
      case "accounts":
        return (
          <div data-testid="accounts-tab-content">
            <AccountList {...context} sourceApp="CRM" />
          </div>
        );
      case "contacts":
        return (
          <div data-testid="contacts-tab-content">
            <ContactList {...context} sourceApp="CRM" />
          </div>
        );
      case "opportunities":
        return renderOpportunitiesContent();
      case "analytics":
        return renderDashboardContent();
      default:
        return null;
    }
  };

  return (
    <div data-testid="customer-relations-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Handshake,
          variant: "strategy",
          size: "lg",
          label: "Customer Relations"
        }}
        headerTitle="Customer Relations"
        headerDescription="Manage customer relationships, track leads, accounts, contacts, and sales opportunities"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  );
};

export default CustomerRelations;
