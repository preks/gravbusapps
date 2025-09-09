import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { WalletIcon } from "@phosphor-icons/react";
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { MODULE_COLORS } from '@/common/constants/ui';


const moduleColor = MODULE_COLORS.FIN;
// Create a global API for tab navigation

interface TabNavigationState {
  setActiveTab: (tabKey: string) => void;
  filter?: string;
}

// Declare variable in global window object
declare global {
  interface Window {
    tabNavigationAPI?: TabNavigationState;
  }
}

// Import tab components (placeholders for now, will be created next)
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab';
import ExpenseItemsTab from './components/tabs/expense-items-tab';
import ExpensePlansTab from './components/tabs/expense-plans-tab';
import AdvancePaymentsTab from './components/tabs/advance-payments-tab';
import ExpenseRequestsTab from './components/tabs/expense-requests-tab';
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab';

export interface PersonalExpensesProps extends BusinessAppContextProps {}

const PersonalExpenses: React.FC<PersonalExpensesProps> = (props) => {
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null);
  
  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = ['dashboard', 'expense-items', 'expense-plans', 'advance-payments', 'expense-requests', 'calendar'];
    
    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!;
    } else {
      // No valid tab in URL, set default tab in URL
      const defaultTab = 'dashboard';
      const url = new URL(window.location.href);
      url.searchParams.set('tab', defaultTab);
      window.history.replaceState({}, '', url.toString());
      return defaultTab;
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      const validTabs = ['dashboard', 'expense-items', 'expense-plans', 'advance-payments', 'expense-requests', 'calendar'];
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : 'dashboard';
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Expose the tab navigation API to the global window object
  useEffect(() => {
    window.tabNavigationAPI = {
      setActiveTab: (tabKey: string) => {
        console.log('Global API: Switching to tab', tabKey);
        handleTabChange(tabKey);
      },
      filter: undefined
    };
    
    return () => {
      window.tabNavigationAPI = undefined;
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // Clear content header for dashboard since it has its own layout
        if (contentHeader) {
          setContentHeader(null);
        }
        return <ExpenseDashboardTab {...props} />;
      case 'expense-items':
        return <ExpenseItemsTab {...props} onContentHeaderChange={(header: ReactNode) => setContentHeader(header)} />;
      case 'expense-plans':
        return <ExpensePlansTab {...props} onContentHeaderChange={(header: ReactNode) => setContentHeader(header)} />;
      case 'advance-payments':
        return <AdvancePaymentsTab {...props} onContentHeaderChange={(header: ReactNode) => setContentHeader(header)} />;
      case 'expense-requests':
        return <ExpenseRequestsTab {...props} onContentHeaderChange={(header: ReactNode) => setContentHeader(header)} />;
      case 'calendar':
        // Clear content header for calendar since it doesn't need statistics
        if (contentHeader) {
          setContentHeader(null);
        }
        return <ExpenseCalendarTab {...props} />;
      default:
        return <ExpenseDashboardTab {...props} />;
    }
  };

  return (
    <div data-testid="personal-expenses-container">
      <PageLayout
        headerIcon={WalletIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.my_expenses',"My Expenses")}
        headerDescription={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.main_description',"Manage your personal expenses, track expenses, and manage advance payments.")}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: [
            { value: 'dashboard', label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn','Dashboard') },
            { value: 'expense-items', label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_items','Expense Items') },
            { value: 'expense-plans', label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans','Expense Plans') },
            { value: 'advance-payments', label: getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title','Advance Payments') },
            { value: 'expense-requests', label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests','Expense Requests') },
            { value: 'calendar', label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.calendar','Calendar') }
          ]
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {/* Render content header (statistics/widget cards) if available */}
        {contentHeader && (
          <div className="gba:mb-6" data-testid="content-header">
            {contentHeader}
          </div>
        )}
        
        {/* Render tab content */}
        {renderTabContent()}
      </PageLayout>
    </div>
  );
};

export default PersonalExpenses;
