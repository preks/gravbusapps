import React, { useEffect, useState, ReactNode } from 'react';
import { Tabs, ActionButton } from '@newwork/gravity-ui-catalog';
import { PiGauge, PiPath, PiHandCoins, PiMoney, PiCalendarBlank, PiWalletDuotone } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab';
import ExpensePlansTab from './components/tabs/expense-plans-tab';
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab';
import AdvancePaymentsTab from './components/tabs/advance-payments-tab';
import ExpenseRequestsTab from './components/tabs/expense-requests-tab';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface ManagerExpensesProps extends BusinessAppContextProps {}

const ManagerExpenses: React.FC<ManagerExpensesProps> = (props) => {
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null);

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiGauge style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Dashboard')}</span>
        </div>
      ),
      children: <ExpenseDashboardTab {...props} />,
      renderContentHeader: () => null,
    },
    {
      key: 'expense-plans',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiPath style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dashboard_btn', 'Expense Plans')}</span>
        </div>
      ),
      children: <ExpensePlansTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
    },
    {
      key: 'advance-payments',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiHandCoins style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.advance_title', 'Advance Payments')}</span>
        </div>
      ),
      children: <AdvancePaymentsTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
    },
    {
      key: 'expense-requests',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiMoney style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Requests')}</span>
        </div>
      ),
      children: <ExpenseRequestsTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
    },
    {
      key: 'expense-calendar',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiCalendarBlank style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Expense Calendar</span>
        </div>
      ),
      children: <ExpenseCalendarTab {...props} />,
      renderContentHeader: () => null, // ExpenseCalendarTab manages its own header/controls
    },
  ];

  // Get tab from URL query parameter or use first tab as default
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = tabItems.map(item => item.key);
    
    if (validTabs.includes(tabFromUrl ?? '')) {
      return tabFromUrl!;
    } else {
      // No valid tab in URL, set default tab in URL
      const defaultTab = tabItems[0].key;
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
      const validTabs = tabItems.map(item => item.key);
      const newTab = validTabs.includes(tabFromUrl ?? '') ? tabFromUrl! : tabItems[0].key;
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const activeTabItem = tabItems.find(item => item.key === activeTab);
  const activeTabContent = activeTabItem?.children;
  const activeTabContentHeader = activeTabItem?.renderContentHeader();

  return (
    <PageLayout
      headerIcon={<PiWalletDuotone color="#a3519aff"/>}
      headerLabel="Team Expenses"
      pageHeaderRight={
        <ActionButton
          variant="primary"
          flowData={[
            {
              category: 'Actions',
              key: 'export',
              label: 'Export Data',
              onClick: () => console.log('Export data clicked'),
            },
            {
              category: 'Navigations',
              key: 'settings',
              label: 'Settings',
              onClick: () => console.log('Settings clicked'),
            },
            {
              category: 'Actions',
              key: 'help',
              label: 'Help',
              onClick: () => console.log('Help clicked'),
            },
          ]}
          portalContainer={document.body}
        >
          Actions
        </ActionButton>
      }
      pageController={
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems.map(item => ({ key: item.key, label: item.label }))}
            className="w-full"
          />
      }
      contentHeader={activeTabContentHeader}
      contentContainer={activeTabContent}
    />
  );
};

export default ManagerExpenses;