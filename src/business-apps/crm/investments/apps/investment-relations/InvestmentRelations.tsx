import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { ToggleGroup, ToggleGroupItem } from '@newwork/nw-design-system';
import { 
  DollarCircleOutlined, 
  ReloadOutlined, 
  TeamOutlined,
  BarChartOutlined,
  UserOutlined,
  FundOutlined,
  BankOutlined,
  ContactsOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { LeadList } from '@/business-apps/crm/common/components/lead-list';
import { AccountList } from '@/business-apps/crm/common/components/account-list';
import { ContactList } from '@/business-apps/crm/common/components/contact-list';
import { OpportunityList } from '@/business-apps/crm/common/components/opportunity-list';
import InvestmentsDashboard from './components/views/investments-dashboard/InvestmentsDashboard';
import { Account } from '@/business-apps/crm/common/components/account-list/types';
import { Contact } from '@/business-apps/crm/common/components/contact-list/types';
import { Opportunity } from '@/business-apps/crm/common/components/opportunity-list/types';

export interface InvestmentRelationsProps extends BusinessAppContextProps {}

export const InvestmentRelations: React.FC<InvestmentRelationsProps> = (context) => {
  const tabOptions = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'leads',
      icon: <TeamOutlined />,
      label: 'Leads'
    },
    {
      key: 'accounts',
      icon: <BankOutlined />,
      label: 'Accounts'
    },
    {
      key: 'contacts',
      icon: <ContactsOutlined />,
      label: 'Contacts'
    },
    {
      key: 'opportunities',
      icon: <DollarCircleOutlined />,
      label: 'Opportunities'
    }
  ];

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get('view');
    
    // Validate that the view exists in our options
    if (viewFromUrl && tabOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl;
    }
    
    // Default to first view
    return tabOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());

  const handleRefresh = () => {
    // TODO: Add refresh functionality when more data sources are available
    window.location.reload();
  };

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Always set the view parameter (including for default)
    urlParams.set('view', view);
    
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleTabChange = (key: string) => {
    // Prevent deselection - if key is empty or same as current, ignore the change
    if (!key || key === activeTab) {
      return;
    }
    setActiveTab(key);
    updateUrl(key);
  };

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('view')) {
      updateUrl(activeTab);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setActiveTab(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div data-testid="dashboard-tab-content">
            <InvestmentsDashboard 
              accessToken={context.accessToken}
              userInfo={context.userInfo}
            />
          </div>
        );
      case 'leads':
        return (
          <div data-testid="leads-tab-content">
            <LeadList {...context} sourceApp="IRM" />
          </div>
        );
      case 'accounts':
        return (
          <div data-testid="accounts-tab-content">
            <AccountList {...context} sourceApp="IRM" />
          </div>
        );
      case 'contacts':
        return (
          <div data-testid="contacts-tab-content">
            <ContactList {...context} sourceApp="IRM" />
          </div>
        );
      case 'opportunities':
        return (
          <div data-testid="opportunities-tab-content">
            <OpportunityList {...context} sourceApp="IRM" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="investment-relations-app">
      <PageLayout
        headerIcon={<FundOutlined />}
        headerLabel="Investment Relations"
        pageHeaderCenter={
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={handleTabChange}
            variant="outline"
            size="lg"
            data-testid="investment-relations-tabs"
          >
            {tabOptions.map((option) => (
              <ToggleGroupItem
                key={option.key}
                value={option.key}
                data-testid={`investment-relations-tab-${option.key}`}
              >
                {option.icon}
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
        pageHeaderRight={
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:text-right gba:text-gray-600 gba:text-sm gba:hidden sm:gba:block">
              <div>Last updated</div>
              <div className="gba:font-medium">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <Button
              data-testid="investment-relations-refresh-button"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              <span className="gba:hidden sm:gba:inline">Refresh</span>
            </Button>
          </div>
        }
        contentContainer={
          <div className="gba:h-full gba:overflow-auto">
            {renderTabContent()}
          </div>
        }
        className="gba:min-h-screen"
      />
    </div>
  );
};

export default InvestmentRelations; 