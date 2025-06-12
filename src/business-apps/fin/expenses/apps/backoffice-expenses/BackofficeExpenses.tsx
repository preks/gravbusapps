/**
 * Expense Management Overview Screen
 * 
 * This component displays the expense management dashboard with KPIs and expense request management.
 * It integrates with the MCP GraphQL API to fetch real expense request data.
 */

import React, { useState } from 'react';
import { Tabs } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components
import DashboardTab from './components/tabs/DashboardTab';
import ExpenseRequestTab from './components/tabs/ExpenseRequestTab';
import AdvancePaymentTab from './components/tabs/AdvancePaymentTab';

interface BackofficeExpensesProps extends BusinessAppContextProps {}

const BackofficeExpenses: React.FC<BackofficeExpensesProps> = (props) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      children: <DashboardTab {...props} />,
    },
    {
      key: 'expense-requests',
      label: 'Expense Requests',
      children: <ExpenseRequestTab {...props} />,
    },
    {
      key: 'advance-payments',
      label: 'Advance Payments',
      children: <AdvancePaymentTab {...props} />,
    },
  ];

  const activeTabItem = tabItems.find(item => item.key === activeTab);
  const activeTabContent = activeTabItem?.children;

  return (
    <PageLayout
      headerIcon={<WalletOutlined size={32} />}
      headerLabel="Expense Management"
      pageController={
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map(item => ({ key: item.key, label: item.label }))}
          className="w-full"
        />
      }
      contentContainer={activeTabContent}
    />
  );
};

export default BackofficeExpenses;
