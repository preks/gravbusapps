import React, { useEffect, useState, ReactNode } from 'react';

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
import { Tabs } from '@newwork/gravity-ui-catalog';
import { PiGauge, PiReceipt, PiPath, PiHandCoins, PiMoney, PiWalletDuotone, PiCalendar } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'; // Adjusted import path
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components (placeholders for now, will be created next)
import ExpenseDashboardTab from './components/tabs/expense-dashboard-tab';
import ExpenseItemsTab from './components/tabs/expense-items-tab';
import ExpensePlansTab from './components/tabs/expense-plans-tab';
import AdvancePaymentsTab from './components/tabs/advance-payments-tab';
import ExpenseRequestsTab from './components/tabs/expense-requests-tab';
import ExpenseCalendarTab from './components/tabs/expense-calendar-tab';
import ExpenseAi from './components/expense-ai';

export interface PersonalExpensesProps extends BusinessAppContextProps {}

const PersonalExpenses: React.FC<PersonalExpensesProps> = (props) => {
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
      children: <ExpenseDashboardTab {...props} />,
      renderContentHeader: () => null,
    },
    {
      key: 'expense-items',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiReceipt style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Expense Items</span>
        </div>
      ),
      children: <ExpenseItemsTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
    },
    {
      key: 'expense-plans',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiPath style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Expense Plans</span>
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
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Advance Payments</span>
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
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Expense Requests</span>
        </div>
      ),
      children: <ExpenseRequestsTab 
        {...props} 
        onContentHeaderChange={(header: ReactNode) => setContentHeader(header)}
      />,
      renderContentHeader: () => contentHeader,
    },
    {
      key: 'calendar',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiCalendar style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle', marginRight: '-4px' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Calendar</span>
        </div>
      ),
      children: <ExpenseCalendarTab {...props} />,
      renderContentHeader: () => null, // Assuming no specific header for the calendar tab for now
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

  const activeTabItem = tabItems.find(item => item.key === activeTab);
  const activeTabContent = activeTabItem?.children;
  const activeTabContentHeader = activeTabItem?.renderContentHeader();

  return (
    <PageLayout
      headerIcon={<PiWalletDuotone color="#c92559"/>}
      headerLabel="My Expenses"
      // pageHeaderCenter={<ExpenseAi />}
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

export default PersonalExpenses;
