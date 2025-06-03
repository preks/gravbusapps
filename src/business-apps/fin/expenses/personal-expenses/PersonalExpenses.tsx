import React, { useEffect, useState, ReactNode } from 'react';
import { Tabs } from '@newwork/gravity-ui-catalog';
import { WalletOutlined } from '@ant-design/icons';
import { PiGauge, PiReceipt, PiPath, PiHandCoins, PiMoney } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'; // Adjusted import path
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import tab components (placeholders for now, will be created next)
import DashboardTab from './components/DashboardTab';
import ExpenseItemsTab from './components/ExpenseItemsTab';
import ExpensePlansTab from './components/ExpensePlansTab';
import AdvancePaymentsTab from './components/AdvancePaymentsTab';
import ExpenseRequestsTab from './components/ExpenseRequestsTab';

export interface PersonalExpensesProps extends BusinessAppContextProps {}

const PersonalExpenses: React.FC<PersonalExpensesProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contentHeader, setContentHeader] = useState<ReactNode | null>(null);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['dashboard', 'expense-items', 'expense-plans', 'advance-payments', 'expense-requests'].includes(hash)) {
      setActiveTab(hash);
    } else {
      // Default to 'dashboard' if hash is invalid or not present
      setActiveTab('dashboard');
      navigate('#dashboard', { replace: true });
    }
  }, [location.hash, navigate]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    navigate(`#${key}`);
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
  ];

  const activeTabItem = tabItems.find(item => item.key === activeTab);
  const activeTabContent = activeTabItem?.children;
  const activeTabContentHeader = activeTabItem?.renderContentHeader();

  return (
    <PageLayout
      headerIcon={<WalletOutlined />}
      headerLabel="My Expenses"
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
