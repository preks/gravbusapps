import React, { useEffect, useState, ReactNode } from 'react';
import { Tabs, ActionButton } from '@newwork/gravity-ui-catalog';
import { WalletOutlined } from '@ant-design/icons';
import { PiGauge, PiPath, PiHandCoins, PiMoney, PiCalendarBlank } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import DashboardTab from './components/DashboardTab';
import ExpensePlansTab from './components/ExpensePlansTab';
import ExpenseCalendarTab from './components/ExpenseCalendarTab';
import AdvancePaymentsTab from './components/AdvancePaymentsTab';
import ExpenseRequestsTab from './components/ExpenseRequestsTab';

export interface ManagerExpensesProps extends BusinessAppContextProps {}

const ManagerExpenses: React.FC<ManagerExpensesProps> = (props) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

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

  const activeTabItem = tabItems.find(item => item.key === activeTab);
  const activeTabContent = activeTabItem?.children;
  const activeTabContentHeader = activeTabItem?.renderContentHeader();

  return (
    <PageLayout
      headerIcon={<WalletOutlined size={32}/>}
      headerLabel="Team Expenses"
      pageHeaderRight={
        <ActionButton
          variant="primary"
          flowData={[
            {
              key: 'export',
              label: 'Export Data',
              onClick: () => console.log('Export data clicked'),
            },
            {
              key: 'settings',
              label: 'Settings',
              onClick: () => console.log('Settings clicked'),
            },
            {
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