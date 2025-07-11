import React, { useState, useEffect } from 'react';
import { Tabs, Button, Spin, Alert } from 'antd';
import { ToggleGroup, ToggleGroupItem, PageLayout } from '@newwork/nw-design-system';
import {
  DashboardOutlined,
  ReloadOutlined,
  BarChartOutlined,
  UserOutlined,
  PieChartOutlined,
  TeamOutlined,
  BankOutlined,
  ContactsOutlined,
  DollarCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { Handshake } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { OverviewTab } from './components/tabs/sales-dashboard/components/OverviewTab';
import { PipelineDetailsTab } from './components/tabs/sales-dashboard/components/PipelineDetailsTab';
import { useSalesDashboard } from './components/tabs/sales-dashboard/hooks/useSalesDashboard';
import { DateRange } from './components/tabs/sales-dashboard/types/dashboardTypes';
import { LeadList } from '@/business-apps/crm/common/components/lead-list';
import { AccountList } from '@/business-apps/crm/common/components/account-list';
import { ContactList } from '@/business-apps/crm/common/components/contact-list';
import { OpportunityList } from '@/business-apps/crm/common/components/opportunity-list';
import { OpportunityBoard } from '@/business-apps/crm/common/components/opportunity-board';
import { Account } from '@/business-apps/crm/common/components/account-list/types';
import { Contact } from '@/business-apps/crm/common/components/contact-list/types';
import { Opportunity } from '@/business-apps/crm/common/components/opportunity-list/types';

export interface CustomerRelationsProps extends BusinessAppContextProps { }

export const CustomerRelations: React.FC<CustomerRelationsProps> = (context) => {
  const viewOptions = [
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
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl;
    }

    // Default to first view
    return viewOptions[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialView());
  const [dateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear() - 2, 0, 1),
    endDate: new Date()
  });

  const {
    pipelines,
    isLoading,
    error,
    refetch
  } = useSalesDashboard(context, dateRange);

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

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spin size="large" />
            <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
              Loading Customer Relations Dashboard...
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="gba:p-6">
          <Alert
            message="Error Loading Dashboard"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={refetch} type="primary">
                Retry
              </Button>
            }
            className="gba:shadow-sm"
          />
        </div>
      );
    }

    const dashboardTabItems = [
      {
        key: 'overview',
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <BarChartOutlined />
            <span>Overview</span>
          </div>
        ),
        children: (
          <OverviewTab
            pipelines={pipelines}
            dateRange={dateRange}
            {...context}
          />
        )
      },
      {
        key: 'pipelines',
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PieChartOutlined />
            <span>Pipeline Details</span>
          </div>
        ),
        children: (
          <PipelineDetailsTab
            pipelines={pipelines}
            dateRange={dateRange}
            {...context}
          />
        )
      }
    ];

    return (
      <Tabs
        defaultActiveKey="overview"
        size="large"
        className="gba:h-full gba:dashboard-tabs"
        items={dashboardTabItems}
        tabBarStyle={{ marginBottom: 16 }}
        data-testid="dashboard-sub-tabs"
      />
    );
  };

  const renderOpportunitiesContent = () => {
    const opportunitiesTabItems = [
      {
        key: 'list',
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <UnorderedListOutlined />
            <span>List View</span>
          </div>
        ),
        children: (
          <OpportunityList {...context} sourceApp="CRM" />
        )
      },
      {
        key: 'board',
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <AppstoreOutlined />
            <span>Board View</span>
          </div>
        ),
        children: (
          <OpportunityBoard {...context} sourceApp="CRM" />
        )
      }
    ];

    return (
      <Tabs
        defaultActiveKey="list"
        size="large"
        className="gba:h-full gba:opportunities-tabs"
        items={opportunitiesTabItems}
        tabBarStyle={{ marginBottom: 16 }}
        data-testid="opportunities-sub-tabs"
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'leads':
        return (
          <div data-testid="leads-tab-content">
            <LeadList {...context} sourceApp="CRM" />
          </div>
        );
      case 'accounts':
        return (
          <div data-testid="accounts-tab-content">
            <AccountList {...context} sourceApp="CRM" />
          </div>
        );
      case 'contacts':
        return (
          <div data-testid="contacts-tab-content">
            <ContactList {...context} sourceApp="CRM" />
          </div>
        );
      case 'opportunities':
        return renderOpportunitiesContent();
      default:
        return null;
    }
  };

  return (
    <div data-testid="customer-relations-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Handshake,
          variant: "strategy",
          size: "lg",
          label: "Customer Relations"
        }}
        headerTitle="Customer Relations"
        headerDescription="Manage customer relationships, track leads, accounts, contacts, and sales opportunities"
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

export default CustomerRelations; 