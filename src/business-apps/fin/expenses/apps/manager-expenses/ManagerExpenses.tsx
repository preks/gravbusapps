import React, { useEffect, useState, useCallback } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { PiGauge, PiPath, PiHandCoins, PiMoney, PiCalendarBlank, PiWalletDuotone } from 'react-icons/pi';
import { useAppCurrency } from './hooks/useAppCurrency';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab';
import ExpensePlansTab from './components/tabs/expense-plans-tab';
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab';
import AdvancePaymentsTab from './components/tabs/advance-payments-tab';
import ExpenseRequestsTab from './components/tabs/expense-requests-tab';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Import page components
import { ApprovalsPage, ExpenseReportsPage } from './components/pages';
import TeamSpendingAnalyticsPage from './components/pages/TeamSpendingAnalyticsPage';

export interface ManagerExpensesProps extends BusinessAppContextProps {}

const ManagerExpenses: React.FC<ManagerExpensesProps> = (props) => {
  // Initialize currency store when the app loads
  const { primaryCurrency, isLoaded } = useAppCurrency(props);
  
  // Log the primary currency once it's loaded
  useEffect(() => {
    if (isLoaded) {
      console.log('App initialized with primary currency:', primaryCurrency);
    }
  }, [isLoaded, primaryCurrency]);
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <PiGauge className="w-5 h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')
    },
    {
      key: 'expense-plans',
      icon: <PiPath className="w-5 h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans', 'Expense Plans')
    },
    {
      key: 'advance-payments',
      icon: <PiHandCoins className="w-5 h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')
    },
    {
      key: 'expense-requests',
      icon: <PiMoney className="w-5 h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
    },
    {
      key: 'expense-calendar',
      icon: <PiCalendarBlank className="w-5 h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_calendar', 'Expense Calendar')
    }
  ];

  // State for current view/page
  const [currentView, setCurrentView] = useState<'tabs' | 'approvals' | 'reports' | 'analytics'>('tabs');
  
  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = viewOptions.map(item => item.key);
    
    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!;
    } else {
      // No valid tab in URL, set default tab in URL
      const defaultTab = viewOptions[0].key;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', defaultTab);
      window.history.replaceState({}, '', url.toString());
      return defaultTab;
    }
  };

  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Navigation handlers
  const handleNavigateToApprovals = useCallback(() => {
    setCurrentView('approvals');
  }, []);

  const handleNavigateToReports = useCallback(() => {
    setCurrentView('reports');
  }, []);

  const handleNavigateToAnalytics = useCallback(() => {
    setCurrentView('analytics');
  }, []);

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView('tabs');
    setActiveTab('dashboard');
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      const validTabs = viewOptions.map(item => item.key);
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : viewOptions[0].key;
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Create tab props for passing to tab components
  const tabProps = {
    ...props,
    onNavigateToApprovals: handleNavigateToApprovals,
    onNavigateToReports: handleNavigateToReports,
    onNavigateToAnalytics: handleNavigateToAnalytics,
    // Currency is now managed globally via the store, no need to pass it explicitly
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ExpenseDashboardTab 
            {...tabProps}
            onNavigateToApprovals={handleNavigateToApprovals}
            onNavigateToReports={handleNavigateToReports}
            onNavigateToAnalytics={handleNavigateToAnalytics}
          />
        );
      case 'expense-plans':
        return <ExpensePlansTab {...tabProps} />;
      case 'advance-payments':
        return <AdvancePaymentsTab {...tabProps} />;
      case 'expense-requests':
        return <ExpenseRequestsTab {...tabProps} />;
      case 'expense-calendar':
        return <ExpenseCalendarTab {...tabProps} />;
      default:
        return null;
    }
  };

  // Render based on current view
  if (currentView === 'approvals') {
    return (
      <ApprovalsPage 
        {...props}
        onNavigateBack={handleNavigateBackToDashboard}
      />
    );
  }

  if (currentView === 'reports') {
    return (
      <ExpenseReportsPage 
        {...props}
        onNavigateBack={handleNavigateBackToDashboard}
      />
    );
  }

  if (currentView === 'analytics') {
    return (
      <TeamSpendingAnalyticsPage 
        {...props}
        onNavigateBack={handleNavigateBackToDashboard}
      />
    );
  }

  // Default tabs view
  return (
    <div data-testid="manager-expenses-container">
      <PageLayout
        headerIcon={<PiWalletDuotone className="w-6 h-6 text-purple-600" />}
        headerTitle="Team Expenses"
        headerDescription="Manage team expenses, track expense plans, advance payments, and expense requests"
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
        <div className="gba:h-full gba:overflow-auto">
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default ManagerExpenses;