/**
 * Expense Management Overview Screen
 * 
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { GaugeIcon, MoneyIcon, HandCoinsIcon, WalletIcon } from '@phosphor-icons/react';

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab/ExpenseDashboardTab';
import ExpenseRequestTab from './components/tabs/expence-requests-tab/ExpenseRequestTab';
import AdvancePaymentTab from './components/tabs/advance-payments-tab/AdvancePaymentTab';

import { MODULE_COLORS } from '@/common/constants/ui';

const moduleColor = MODULE_COLORS.FIN;

interface BackofficeExpensesProps extends BusinessAppContextProps {}

const BackofficeExpenses: React.FC<BackofficeExpensesProps> = (props) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')
    },
    {
      key: 'expense-requests',
      icon: <MoneyIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')
    },
    {
      key: 'advance-payments',
      icon: <HandCoinsIcon className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')
    }
  ];

  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = viewOptions.map(item => item.key);
    
    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!;
    } else {
      const defaultTab = viewOptions[0].key;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', defaultTab);
      window.history.replaceState({}, '', url.toString());
      return defaultTab;
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

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
      ...props,
      moduleColor: moduleColor
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
        headerIcon={WalletIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_table.expense_management_title', 'Expense Management')}
        headerDescription={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_table.expense_management_subheader', 'Manage backoffice expenses, track expense requests, and advance payments')}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
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
