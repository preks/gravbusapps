import React, { useState, useEffect } from "react";
import { Button, Alert, AlertTitle, AlertDescription } from "@newwork/nw-design-system";
import { Spinner } from "@newwork/nw-design-system";
import { PageLayout } from "@newwork/nw-design-system";
import { Handshake, ChartBar, UsersThree, Buildings, Users, CurrencyDollar, List, Megaphone, House } from "@phosphor-icons/react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { LeadList } from "./views/lead-view";
import { AccountList } from "./views/account-view";
import { ContactList } from "./views/contact-view";
import { OpportunityView } from "./views/opportunity-view";
import { DashboardView } from "./views/dashboard-view";
import { SalesDashboard } from "./views/analytics-view";
import { useSalesDashboard } from "./views/dashboard-view/hooks/useSalesDashboard";
import { DateRange } from "./views/dashboard-view/types/dashboardTypes";
import CampaignManagement from "./views/campaign-view/CampaignManagement";
import { TaskView } from "./views/task-view";

export interface CustomerRelationsProps extends BusinessAppContextProps {}

export const CustomerRelations: React.FC<CustomerRelationsProps> = (
  context
) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <House />,
      label: "Dashboard"
    },
    {
      key: 'tasks',
      icon: <List />,
      label: "Tasks"
    },
    {
      key: "leads",
      icon: <UsersThree />,
      label: "Leads"
    },
    {
      key: "accounts",
      icon: <Buildings />,
      label: "Accounts"
    },
    {
      key: "contacts",
      icon: <Users />,
      label: "Contacts"
    },
    {
      key: "opportunities",
      icon: <CurrencyDollar />,
      label: "Opportunities"
    },
    {
      key: "campaigns",
      icon: <Megaphone />,
      label: "Campaigns"
    },
    {
      key: "analytics",
      icon: <ChartBar />,
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

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  // Sub-view is now handled inside OpportunityView
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

    // Clear campaign-specific parameters when switching away from campaigns view
    if (view !== "campaigns" && (urlParams.has("campaignId") || urlParams.has("mainTab") || urlParams.has("recordTab"))) {
      urlParams.delete("campaignId");
      urlParams.delete("mainTab");  
      urlParams.delete("recordTab");
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
    
    updateUrl(key);
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
      <DashboardView
        pipelines={pipelines}
        dateRange={dateRange}
        {...context}
      />
    );
  };

  const renderAnalyticsContent = () => {
    return (
      <div data-testid="analytics-tab-content">
        <SalesDashboard {...context} />
      </div>
    );
  };

  const renderOpportunitiesContent = () => {
    return <OpportunityView {...context} />;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboardContent();
      case "tasks":
        return (
          <div data-testid="tasks-tab-content">
            <TaskView {...context} />
          </div>
        );
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
      case "campaigns":
        return (
          <div data-testid="campaigns-tab-content">
            <CampaignManagement {...context} />
          </div>
        );
      case "opportunities":
        return renderOpportunitiesContent();
      case "analytics":
        return renderAnalyticsContent();
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
