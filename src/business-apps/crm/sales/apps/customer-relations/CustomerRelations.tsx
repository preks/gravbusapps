import React, { useState } from 'react';
import { Tabs, Button, Spin, Alert } from 'antd';
import { 
  DashboardOutlined, 
  ReloadOutlined, 
  ShoppingCartOutlined,
  BarChartOutlined,
  UserOutlined,
  PieChartOutlined,
  TeamOutlined,
  BankOutlined,
  ContactsOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { OverviewTab } from './components/tabs/sales-dashboard/components/OverviewTab';
import { PipelineDetailsTab } from './components/tabs/sales-dashboard/components/PipelineDetailsTab';
import { useSalesDashboard } from './components/tabs/sales-dashboard/hooks/useSalesDashboard';
import { DateRange } from './components/tabs/sales-dashboard/types/dashboardTypes';
import { LeadList } from '@/business-apps/crm/common/components/lead-list';
import { AccountList } from '@/business-apps/crm/common/components/account-list';
import { ContactList } from '@/business-apps/crm/common/components/contact-list';
import { OpportunityList } from '@/business-apps/crm/common/components/opportunity-list';
import { Account } from '@/business-apps/crm/common/components/account-list/types';
import { Contact } from '@/business-apps/crm/common/components/contact-list/types';
import { Opportunity } from '@/business-apps/crm/common/components/opportunity-list/types';

export interface CustomerRelationsProps extends BusinessAppContextProps {}

export const CustomerRelations: React.FC<CustomerRelationsProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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

  const handleRefresh = () => {
    refetch();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <DashboardOutlined />
          <span>Dashboard</span>
        </div>
      ),
    },
    {
      key: 'leads',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <TeamOutlined />
          <span>Leads</span>
        </div>
      ),
    },
    {
      key: 'accounts',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <BankOutlined />
          <span>Accounts</span>
        </div>
      ),
    },
    {
      key: 'contacts',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <ContactsOutlined />
          <span>Contacts</span>
        </div>
      ),
    },
    {
      key: 'opportunities',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <DollarCircleOutlined />
          <span>Opportunities</span>
        </div>
      ),
    }
  ];

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
        return (
          <div data-testid="opportunities-tab-content">
            <OpportunityList {...context} sourceApp="CRM" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="customer-relations-app">
      <PageLayout
        headerIcon={<ShoppingCartOutlined />}
        headerLabel="Customer Relations"
        pageHeaderCenter={
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="large"
            items={tabItems}
            className="gba:customer-relations-header-tabs"
            data-testid="customer-relations-tabs"
          />
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
              data-testid="customer-relations-refresh-button"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
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

export default CustomerRelations; 