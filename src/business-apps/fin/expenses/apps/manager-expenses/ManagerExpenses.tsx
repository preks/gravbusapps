import React, { useEffect, useState, useCallback } from "react";
import { PageLayout } from "@newwork/nw-design-system";
import {
  PiGauge,
  PiPath,
  PiHandCoins,
  PiMoney,
  PiCalendarBlank,
  PiWalletDuotone,
} from "react-icons/pi";
import { useAppCurrency } from "./hooks/useAppCurrency";

import { BusinessAppContextProps } from "@/common/BusinessAppContext";

// Import tab components
import ExpenseDashboardTab from "./components/tabs/expense-dashboard-tab";
import ExpensePlansTab from "./components/tabs/expense-plans-tab";
import ExpenseCalendarTab from "./components/tabs/expense-calendar-tab";
import AdvancePaymentsTab from "./components/tabs/advance-payments-tab";
import ExpenseRequestsTab from "./components/tabs/expense-requests-tab";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

// Import page components
import { ApprovalsPage, ExpenseReportsPage } from "./components/pages";
import TeamSpendingAnalyticsPage from "./components/pages/TeamSpendingAnalyticsPage";

export interface ManagerExpensesProps extends BusinessAppContextProps {}

const ManagerExpenses: React.FC<ManagerExpensesProps> = (props) => {
  const viewOptions = [
    {
      key: "dashboard",
      icon: PiGauge,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:absence_management_hub_backoffice.dashboard_btn",
        "Dashboard",
      ),
    },
    {
      key: "expense-plans",
      icon: PiPath,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_plans",
        "Expense Plans",
      ),
    },
    {
      key: "advance-payments",
      icon: PiHandCoins,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:backoffice_expense_landing_page.advance_title",
        "Advance Payments",
      ),
    },
    {
      key: "expense-requests",
      icon: PiMoney,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:expense_request_list.title",
        "Expense Requests",
      ),
    },
    {
      key: "expense-calendar",
      icon: PiCalendarBlank,
      label: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_calendar",
        "Expense Calendar",
      ),
    },
  ];

  // State for current view/page
  const [currentView, setCurrentView] = useState<"tabs" | "approvals" | "reports" | "analytics">(
    "tabs",
  );

  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(globalThis.location?.search || "");
    const tabFromUrl = urlParams.get("tab");
    const validTabs = viewOptions.map((item) => item.key);

    if (validTabs.includes(tabFromUrl ?? "")) {
      return tabFromUrl!;
    } else {
      // No valid tab in URL, set default tab in URL
      const defaultTab = viewOptions[0].key;
      const url = new URL(globalThis.location?.href || "http://localhost");
      url.searchParams.set("tab", defaultTab);
      globalThis.history?.replaceState?.({}, "", url.toString());
      return defaultTab;
    }
  };

  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Navigation handlers
  const handleNavigateToApprovals = useCallback(() => {
    setCurrentView("approvals");
  }, []);

  const handleNavigateToReports = useCallback(() => {
    setCurrentView("reports");
  }, []);

  const handleNavigateToAnalytics = useCallback(() => {
    setCurrentView("analytics");
  }, []);

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView("tabs");
    setActiveTab("dashboard");
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const url = new URL(globalThis.location?.href || "http://localhost");
    url.searchParams.set("tab", tab);
    globalThis.history?.pushState?.({}, "", url.toString());
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.location?.search || "");
      const tabFromUrl = urlParams.get("tab");
      const validTabs = viewOptions.map((item) => item.key);
      const newTab = validTabs.includes(tabFromUrl ?? "") ? tabFromUrl! : viewOptions[0].key;
      setActiveTab(newTab);
    };

    globalThis.addEventListener?.("popstate", handlePopState);
    return () => globalThis.removeEventListener?.("popstate", handlePopState);
  }, []);

  // Create tab props for passing to tab components
  const tabProps = {
    ...props,
    onNavigateToApprovals: handleNavigateToApprovals,
    onNavigateToReports: handleNavigateToReports,
    onNavigateToAnalytics: handleNavigateToAnalytics,
    // Currency is now managed globally via the store, no need to pass it explicitly
  };

  // Keep tab contents mounted to prefetch and avoid layout flicker
  const renderAllTabsKeptMounted = () => (
    <div>
      <div className={activeTab === "dashboard" ? "" : "gba:hidden"}>
        <ExpenseDashboardTab
          {...tabProps}
          onNavigateToApprovals={handleNavigateToApprovals}
          onNavigateToReports={handleNavigateToReports}
          onNavigateToAnalytics={handleNavigateToAnalytics}
        />
      </div>
      <div className={activeTab === "expense-plans" ? "" : "gba:hidden"}>
        <ExpensePlansTab {...tabProps} />
      </div>
      <div className={activeTab === "advance-payments" ? "" : "gba:hidden"}>
        <AdvancePaymentsTab {...tabProps} />
      </div>
      <div className={activeTab === "expense-requests" ? "" : "gba:hidden"}>
        <ExpenseRequestsTab {...tabProps} />
      </div>
      <div className={activeTab === "expense-calendar" ? "" : "gba:hidden"}>
        <ExpenseCalendarTab {...tabProps} />
      </div>
    </div>
  );

  // Render based on current view
  if (currentView === "approvals") {
    return <ApprovalsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />;
  }

  if (currentView === "reports") {
    return <ExpenseReportsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />;
  }

  if (currentView === "analytics") {
    return <TeamSpendingAnalyticsPage {...props} onNavigateBack={handleNavigateBackToDashboard} />;
  }

  // Default tabs view
  return (
    <div data-testid="manager-expenses-container">
      <PageLayout
        headerIcon={PiWalletDuotone}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.team_expenses_title",
          "Team Expenses",
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.team_expenses_subheader",
          "Manage team expenses, track expense plans, advance payments, and expense requests",
        )}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
          })),
        }}
        className="gba:min-h-screen"
      >
        {renderAllTabsKeptMounted()}
      </PageLayout>
    </div>
  );
};

export default ManagerExpenses;
