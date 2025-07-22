/**
 * Expense Management Overview Screen
 * 
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { PiGauge, PiMoney, PiHandCoins, PiWalletDuotone } from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab/ExpenseDashboardTab';
import ExpenseRequestTab from './components/tabs/expence-requests-tab/ExpenseRequestTab';
import AdvancePaymentTab from './components/tabs/advance-payments-tab/AdvancePaymentTab';

interface BackofficeExpensesProps extends BusinessAppContextProps {}

const BackofficeExpenses: React.FC<BackofficeExpensesProps> = (props) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <PiGauge className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')
    },
    {
      key: 'expense-requests',
      icon: <PiMoney className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
    },
    {
      key: 'advance-payments',
      icon: <PiHandCoins className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')
    }
  ];

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
      const validTabs = viewOptions.map(item => item.key);
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : viewOptions[0].key;
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderTabContent = () => {
    const tabProps = {
      ...props
    };

    switch (activeTab) {
      case 'dashboard':
        return <ExpenseDashboardTab {...tabProps} />;
      case 'expense-requests':
        return <ExpenseRequestTab {...tabProps} />;
      case 'advance-payments':
        return <AdvancePaymentTab {...tabProps} />;
      default:
        return null;
    }
  };

  return (
    <div data-testid="backoffice-expenses-container">
      <PageLayout
        headerIcon={<PiWalletDuotone className="gba:w-6 gba:h-6 gba:text-purple-600" />}
        headerTitle="Expense Management"
        headerDescription="Manage backoffice expenses, track expense requests, and advance payments"
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

export default BackofficeExpenses;
