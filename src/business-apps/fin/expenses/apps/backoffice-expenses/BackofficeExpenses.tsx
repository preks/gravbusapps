/**
 * Expense Management Overview Screen
 * 
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState, ReactNode, useEffect } from 'react';
import { Tabs } from '@newwork/gravity-ui-catalog';
import { PiGauge, PiMoney, PiHandCoins, PiWallet } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import DashboardTab from './components/tabs/DashboardTab';
import ExpenseRequestTab from './components/tabs/ExpenseRequestTab';
import AdvancePaymentTab from './components/tabs/AdvancePaymentTab';

interface BackofficeExpensesProps extends BusinessAppContextProps {}

const BackofficeExpenses: React.FC<BackofficeExpensesProps> = (props) => {
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null);

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiGauge style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
        </div>
      ),
      children: <DashboardTab {...props} />,
      renderContentHeader: () => null,
    },
    {
      key: 'expense-requests',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiMoney style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Expense Requests</span>
        </div>
      ),
      children: <ExpenseRequestTab 
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
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Advance Payments</span>
        </div>
      ),
      children: <AdvancePaymentTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
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
      headerIcon={<PiWallet/>}
      headerLabel="Expense Management"
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

export default BackofficeExpenses;
