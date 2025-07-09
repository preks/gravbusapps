import React, { useState } from 'react';
import { Tabs, Button } from 'antd';
import { 
  DollarCircleOutlined, 
  ReloadOutlined, 
  TeamOutlined,
  BarChartOutlined,
  UserOutlined,
  FundOutlined,
  BankOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { LeadList } from '@/business-apps/crm/common/components/lead-list';
import { AccountList } from '@/business-apps/crm/common/components/account-list';
import { ContactList } from '@/business-apps/crm/common/components/contact-list';
import { OpportunityList } from '@/business-apps/crm/common/components/opportunity-list';
import { Account } from '@/business-apps/crm/common/components/account-list/types';
import { Contact } from '@/business-apps/crm/common/components/contact-list/types';
import { Opportunity } from '@/business-apps/crm/common/components/opportunity-list/types';

export interface InvestmentRelationsProps extends BusinessAppContextProps {}

export const InvestmentRelations: React.FC<InvestmentRelationsProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>('leads');

  const handleRefresh = () => {
    // TODO: Add refresh functionality when more data sources are available
    window.location.reload();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabItems = [
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'leads':
        return (
          <div data-testid="investment-leads-tab-content">
            <LeadList {...context} sourceApp="IRM" />
          </div>
        );
      case 'accounts':
        return (
          <div data-testid="investment-accounts-tab-content">
            <AccountList {...context} sourceApp="IRM" />
          </div>
        );
      case 'contacts':
        return (
          <div data-testid="investment-contacts-tab-content">
            <ContactList {...context} sourceApp="IRM" />
          </div>
        );
      case 'opportunities':
        return (
          <div data-testid="investment-opportunities-tab-content">
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
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="large"
            items={tabItems}
            className="gba:investment-relations-header-tabs"
            data-testid="investment-relations-tabs"
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